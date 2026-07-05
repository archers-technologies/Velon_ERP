import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";
import { isPasswordStrong, passwordStrengthMessage } from "@velon/shared";

export function IsVelonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isVelonPassword",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && isPasswordStrong(value);
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value;
          if (typeof value === "string") {
            return passwordStrengthMessage(value) ?? "Password does not meet requirements.";
          }
          return "Password does not meet requirements.";
        },
      },
    });
  };
}
