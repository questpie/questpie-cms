/**
 * Setup Form - create first admin account
 */

import {
  Envelope,
  Lock,
  SpinnerGap,
  User,
  WarningCircle,
} from "@phosphor-icons/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

export type SetupFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SetupFormProps = {
  /** Called when form is submitted with valid data */
  onSubmit: (values: SetupFormValues) => Promise<void>;
  /** Default values */
  defaultValues?: Partial<SetupFormValues>;
  /** Additional class name */
  className?: string;
  /** Error message from setup */
  error?: string | null;
};

/**
 * Setup form for creating the first admin account.
 *
 * @example
 * ```tsx
 * function SetupPage() {
 *   const [error, setError] = useState<string | null>(null)
 *
 *   const handleSetup = async (values: SetupFormValues) => {
 *     const result = await client.rpc.createFirstAdmin({
 *       email: values.email,
 *       password: values.password,
 *       name: values.name,
 *     })
 *     if (!result.success) {
 *       setError(result.error)
 *     }
 *   }
 *
 *   return (
 *     <AuthLayout title="Welcome">
 *       <SetupForm onSubmit={handleSetup} error={error} />
 *     </AuthLayout>
 *   )
 * }
 * ```
 */
export function SetupForm({
  onSubmit,
  defaultValues,
  className,
  error,
}: SetupFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      ...defaultValues,
    },
  });

  const password = watch("password");

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={handleFormSubmit} className={cn("space-y-4", className)}>
      <FieldGroup>
        {/* Name Field */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <FieldContent>
            <div className="relative">
              <User
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="name"
                type="text"
                placeholder="Admin User"
                className="pl-8"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                })}
              />
            </div>
            <FieldError>{errors.name?.message}</FieldError>
          </FieldContent>
        </Field>

        {/* Email Field */}
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Envelope
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                className="pl-8"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                })}
              />
            </div>
            <FieldError>{errors.email?.message}</FieldError>
          </FieldContent>
        </Field>

        {/* Password Field */}
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Lock
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                className="pl-8"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
            </div>
            <FieldError>{errors.password?.message}</FieldError>
          </FieldContent>
        </Field>

        {/* Confirm Password Field */}
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Lock
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                className="pl-8"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
              />
            </div>
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </FieldContent>
        </Field>
      </FieldGroup>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <WarningCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <SpinnerGap className="animate-spin" weight="bold" />
            Creating account...
          </>
        ) : (
          "Create Admin Account"
        )}
      </Button>
    </form>
  );
}
