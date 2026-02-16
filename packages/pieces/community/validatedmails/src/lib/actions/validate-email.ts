import { createAction, Property } from '@activepieces/pieces-framework';
import { validatedMailsAuth } from '../common/auth';
import { executeValidateEmailRequest } from '../common/validate-email-helpers';

export const validateEmail = createAction({
  auth: validatedMailsAuth,
  name: 'validateEmail',
  displayName: 'Validate Email',
  description: 'Validate a single email address using the ValidatedMails API.',
  props: {
    email: Property.ShortText({
      displayName: 'Email Address',
      description: 'The email address to validate.',
      required: true,
    }),
  },
  async run(context) {
    return executeValidateEmailRequest(context.propsValue, context.auth.secret_text);
  },
});
