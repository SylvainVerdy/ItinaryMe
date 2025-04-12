import { type Resolver } from 'react-hook-form';
import { type ZodTypeAny, type ZodError, type z } from 'zod';

type FormError<T> = {
  [K in keyof T]?: string[];
};

export const zodResolver = <Schema extends ZodTypeAny>(
  schema: Schema,
): Resolver<z.infer<Schema>> => async (values) => {
  const result = await schema.safeParseAsync(values);

  if (result.success) {
    return {
      values: result.data,
      errors: {},
    };
  } else {
    const zodError: ZodError = result.error;
    const errors: FormError<z.infer<Schema>> = {};

    zodError.issues.forEach((issue) => {
      const path = issue.path.join('.');
      errors[path as keyof typeof errors] =
        errors[path as keyof typeof errors] || [];
      errors[path as keyof typeof errors]?.push(issue.message);
    });

    return {
      values: {},
      errors,
    };
  }
};