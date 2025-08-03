import {
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "isFutureDate", async: false })
export class IsFutureDate implements ValidatorConstraintInterface {
	validate(value: string, _args: ValidationArguments) {
		if (!value) return false;

		const inputDate = new Date(value);
		const currentDate = new Date();

		// Check if the input date is valid
		if (isNaN(inputDate.getTime())) {
			return false;
		}

		// Check if the input date is in the future
		return inputDate > currentDate;
	}

	defaultMessage(_args: ValidationArguments) {
		return "Expiration date must be in the future";
	}
}
