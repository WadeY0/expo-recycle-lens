import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function Match<T extends object>(
  property: keyof T,
  validationOptions?: ValidationOptions,
) {
  return function (obj: T, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: obj.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [keyof T];
          const relatedValue = (args.object as T)[relatedPropertyName];

          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must match ${args.constraints[0]}`;
        },
      },
    });
  };
}
