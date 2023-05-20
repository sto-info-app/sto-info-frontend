import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas); // Add all FontAwesome icons to the library

beforeEach(() => {
  spyOn(console, 'error').and.callFake((...args) => {
    fail(`Console.error was called with arguments: ${args}`);
  });
});
