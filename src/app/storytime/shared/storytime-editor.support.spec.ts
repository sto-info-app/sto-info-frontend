import { FormBuilder, FormGroup } from '@angular/forms';
import { syncImageDescription } from './storytime-editor.support';

describe('syncImageDescription', () => {
  let form: FormGroup;

  beforeEach(() => {
    form = new FormBuilder().group({ title: [''] });
  });

  // A description is required whenever there is something to describe and
  // refused when there is not, so a form that always carried the field would
  // send an empty one on every save of a work with no artwork.
  it('adds nothing while the slot is empty', () => {
    syncImageDescription(form, 'bannerImageAlt', null, null);

    expect(form.get('bannerImageAlt')).toBeNull();
    expect(form.value).toEqual({ title: '' });
  });

  it('adds the description once there is a picture', () => {
    syncImageDescription(
      form,
      'bannerImageAlt',
      'https://images.example/banner',
      'The USS Ares at warp',
    );

    expect(form.value).toEqual({
      title: '',
      bannerImageAlt: 'The USS Ares at warp',
    });
  });

  it('starts blank when the server holds no description yet', () => {
    syncImageDescription(
      form,
      'bannerImageAlt',
      'https://images.example/banner',
      null,
    );

    expect(form.get('bannerImageAlt')?.value).toBe('');
  });

  // Required, because an image nobody has described is simply absent to a
  // reader using a screen reader.
  it('requires a description of a picture that exists', () => {
    syncImageDescription(
      form,
      'bannerImageAlt',
      'https://images.example/banner',
      '',
    );

    expect(form.get('bannerImageAlt')?.valid).toBe(false);
  });

  it('replaces the wording when the picture is replaced', () => {
    syncImageDescription(form, 'bannerImageAlt', 'first', 'A ship');
    syncImageDescription(form, 'bannerImageAlt', 'second', 'A fleet');

    expect(form.get('bannerImageAlt')?.value).toBe('A fleet');
  });

  it('empties the wording when a replacement carries none', () => {
    syncImageDescription(form, 'bannerImageAlt', 'first', 'A ship');
    syncImageDescription(form, 'bannerImageAlt', 'second', null);

    expect(form.get('bannerImageAlt')?.value).toBe('');
  });

  it('takes the description away with the picture', () => {
    syncImageDescription(form, 'bannerImageAlt', 'first', 'A ship');
    syncImageDescription(form, 'bannerImageAlt', null, null);

    expect(form.get('bannerImageAlt')).toBeNull();
  });
});
