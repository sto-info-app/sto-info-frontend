import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { LcarsErrorMessageComponent } from 'src/app/shared/components/lcars-error-message/lcars-error-message.component';
import { LcarsInformationMessageComponent } from 'src/app/shared/components/lcars-information-message/lcars-information-message.component';
import { LoadingBarComponent } from 'src/app/shared/components/loading-bar/loading-bar.component';
import {
  FORM_ERROR_EMAIL_MAX_LENGTH,
  FORM_ERROR_EMAIL_REQUIRED,
  FORM_ERROR_INVALID_EMAIL_FORMAT,
  FORM_ERROR_MESSAGE_MAX_LENGTH,
  FORM_ERROR_MESSAGE_REQUIRED,
  FORM_ERROR_NAME_MAX_LENGTH,
  FORM_ERROR_NAME_REQUIRED,
  FORM_ERROR_TOPIC_REQUIRED,
  MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT,
  MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT,
  MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT,
} from 'src/app/shared/constants/error-messages.constants';
import {
  MAX_CHARS_GENERAL_STRING,
  MAX_CHARS_MESSAGE,
  MAX_CHARS_NAMES,
} from 'src/app/shared/constants/forms.constants';
import { EMAIL_PATTERN } from 'src/app/shared/constants/regex-patterns.constants';
import { CONTACT_TOPICS } from './contact.constants';
import { ContactService } from './contact.service';
import {
  ContactSubmissionRequest,
  ContactTopic,
} from './models/contact-form.models';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingBarComponent,
    LcarsErrorMessageComponent,
    LcarsInformationMessageComponent,
  ],
})
export class ContactComponent {
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  topics = CONTACT_TOPICS;

  // Allow constants to be used in the HTML
  errorTextNameRequired: string = FORM_ERROR_NAME_REQUIRED;
  errorTextNameMaxLength: string = FORM_ERROR_NAME_MAX_LENGTH;
  errorTextEmailRequired: string = FORM_ERROR_EMAIL_REQUIRED;
  errorTextEmailInvalidFormat: string = FORM_ERROR_INVALID_EMAIL_FORMAT;
  errorTextEmailMaxLength: string = FORM_ERROR_EMAIL_MAX_LENGTH;
  errorTextTopicRequired: string = FORM_ERROR_TOPIC_REQUIRED;
  errorTextMessageRequired: string = FORM_ERROR_MESSAGE_REQUIRED;
  errorTextMessageMaxLength: string = FORM_ERROR_MESSAGE_MAX_LENGTH;

  private readonly formBuilder = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  contactForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(MAX_CHARS_NAMES)]],
    email: [
      '',
      [
        Validators.required,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(MAX_CHARS_GENERAL_STRING),
      ],
    ],
    topic: ['', [Validators.required]],
    message: [
      '',
      [Validators.required, Validators.maxLength(MAX_CHARS_MESSAGE)],
    ],
  });

  get formControls() {
    return this.contactForm.controls;
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: ContactSubmissionRequest = {
      name: this.formControls.name.value,
      email: this.formControls.email.value,
      topic: this.formControls.topic.value as ContactTopic,
      message: this.formControls.message.value,
    };

    this.contactService
      .submitContactForm(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage =
            'Thanks for reaching out. Your message has been received and a confirmation email is on its way.';
          this.resetForm();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getSubmitErrorMessage(error);
        },
      });
  }

  private getSubmitErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      console.error(MSG_ERROR_HTTP_STATUS_0_CONSOLE_TEXT);
      return MSG_ERROR_HTTP_STATUS_0_DISPLAY_TEXT;
    }

    if (error.status === 400) {
      console.error(MSG_ERROR_HTTP_STATUS_400_CONSOLE_TEXT);
      return MSG_ERROR_HTTP_STATUS_400_DISPLAY_TEXT;
    }

    console.error('Contact form submission failed:', error);
    return 'Unable to send your message right now. Please try again soon.';
  }

  private resetForm(): void {
    this.contactForm.reset({
      name: '',
      email: '',
      topic: '',
      message: '',
    });
  }
}
