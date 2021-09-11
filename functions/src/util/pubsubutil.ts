import Joi = require("joi");

export function verifyObjectHasSchemaAndCast<T>(unknownObject: any, schema: any): T {
  const validationResult = (Joi as any).validate(unknownObject, schema);

  if (validationResult.error) {
    throw new Error(validationResult.error.message);
  }

  return unknownObject as T;
}
