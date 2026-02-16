import { HttpMethod } from '@activepieces/pieces-common';
import {
  assertEmailInput,
  executeValidateEmailRequest,
  mapHttpStatusToError,
  toValidationOutput,
} from './validate-email-helpers';

describe('validatedmails helpers', () => {
  test('guards email input with @', () => {
    expect(() => assertEmailInput('invalid-email')).toThrow(
      'Email address must contain @'
    );
    expect(() => assertEmailInput(' user@example.com ')).not.toThrow();
  });

  test('routes to POST with body', async () => {
    const sender = jest.fn().mockResolvedValue({
      body: {
        is_valid: true,
        score: 99,
        email: 'user@example.com',
        normalized: 'user@example.com',
        state: 'Deliverable',
        reason: 'ACCEPTED EMAIL',
        domain: 'example.com',
        free: false,
        role: false,
        disposable: false,
        accept_all: false,
        tag: false,
        smtp_ok: true,
        syntax_ok: true,
        mx_ok: true,
        a_ok: true,
        response_ms: 300,
        mx_hosts: ['mx.example.com'],
        status: 'valid',
        reasons: ['syntax_ok'],
        trace_id: 'trace-1',
      },
    });

    await executeValidateEmailRequest(
      {
        email: ' user@example.com ',
      },
      'api-key',
      sender
    );

    expect(sender).toHaveBeenCalledWith(
      expect.objectContaining({
        method: HttpMethod.POST,
        body: {
          email: 'user@example.com',
        },
      })
    );
  });

  test('maps api status errors', () => {
    expect(mapHttpStatusToError(401).message).toBe('Unauthorized: Invalid API key');
    expect(mapHttpStatusToError(402).message).toBe('Insufficient credits');
    expect(mapHttpStatusToError(429).message).toBe('Rate limited');
    expect(mapHttpStatusToError(503).message).toBe('Service unavailable');
  });

  test('retries once on transport error and succeeds', async () => {
    const sender = jest
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        body: {
          is_valid: false,
          score: 0,
          email: 'user@example.com',
          normalized: 'user@example.com',
          state: 'Not Deliverable',
          reason: 'INVALID MAIL',
          domain: 'example.com',
          free: false,
          role: false,
          disposable: false,
          accept_all: false,
          tag: false,
          smtp_ok: false,
          syntax_ok: true,
          mx_ok: true,
          a_ok: true,
          response_ms: 301,
          mx_hosts: ['mx.example.com'],
          status: 'invalid',
          reasons: ['mx_ok'],
          trace_id: 'trace-2',
        },
      });

    const result = await executeValidateEmailRequest(
      {
        email: 'user@example.com',
      },
      'api-key',
      sender
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('invalid');
  });

  test('retries with trailing slash on redirect-like status', async () => {
    const redirectError = Object.assign(new Error('redirect'), {
      response: {
        status: 308,
      },
    });

    const sender = jest
      .fn()
      .mockRejectedValueOnce(redirectError)
      .mockResolvedValueOnce({
        body: {
          is_valid: true,
          score: 92,
          email: 'user@example.com',
          normalized: 'user@example.com',
          state: 'Deliverable',
          reason: 'ACCEPTED EMAIL',
          domain: 'example.com',
          free: false,
          role: false,
          disposable: false,
          accept_all: false,
          tag: false,
          smtp_ok: true,
          syntax_ok: true,
          mx_ok: true,
          a_ok: true,
          response_ms: 250,
          mx_hosts: ['mx.example.com'],
          status: 'valid',
          reasons: ['syntax_ok', 'mx_ok'],
          trace_id: 'trace-redirect',
        },
      });

    const result = await executeValidateEmailRequest(
      {
        email: 'user@example.com',
      },
      'api-key',
      sender
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: HttpMethod.POST,
        url: 'https://api.validatedmails.com/validate',
      })
    );
    expect(sender).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: HttpMethod.POST,
        url: 'https://api.validatedmails.com/validate/',
      })
    );
    expect(result.status).toBe('valid');
  });

  test('returns typed flat output', () => {
    const output = toValidationOutput({
      is_valid: true,
      score: 95,
      email: 'user@example.com',
      normalized: 'user@example.com',
      state: 'Deliverable',
      reason: 'ACCEPTED EMAIL',
      domain: 'example.com',
      free: false,
      role: true,
      disposable: false,
      accept_all: false,
      tag: false,
      smtp_ok: true,
      syntax_ok: true,
      mx_ok: true,
      a_ok: true,
      response_ms: 400,
      mx_hosts: ['mx1.example.com'],
      status: 'valid',
      reasons: ['syntax_ok'],
      trace_id: 'trace-3',
    });

    expect(output).toEqual({
      is_valid: true,
      score: 95,
      email: 'user@example.com',
      normalized: 'user@example.com',
      state: 'Deliverable',
      reason: 'ACCEPTED EMAIL',
      domain: 'example.com',
      free: false,
      role: true,
      disposable: false,
      accept_all: false,
      tag: false,
      smtp_ok: true,
      mx_record: undefined,
      syntax_ok: true,
      mx_ok: true,
      a_ok: true,
      response_ms: 400,
      mx_hosts: ['mx1.example.com'],
      status: 'valid',
      reasons: ['syntax_ok'],
      trace_id: 'trace-3',
    });
  });
});
