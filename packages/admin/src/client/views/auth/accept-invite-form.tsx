/**
 * Accept Invite Form - complete registration after receiving invitation
 */

import { Lock, SpinnerGap, User, WarningCircle } from "@phosphor-icons/react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

export type AcceptInviteFormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

export type AcceptInviteFormProps = {
  /** Called when form is submitted with valid data */
  onSubmit: (values: AcceptInviteFormValues) => Promise<void>;
  /** Email from the invitation (display only) */
  email?: string;
  /** Additional class name */
  className?: string;
  /** Error message from auth */
  error?: string | null;
  /** Minimum password length */
  minPasswordLength?: number;
};

/**
 * Accept invite form for new users to complete registration
 *
 * @example
 * ```tsx
 * function AcceptInvitePage({ token }: { token: string }) {
 *   const authClient = useAuthClient()
 *   const [error, setError] = useState<string | null>(null)
 *   const [invitation, setInvitation] = useState<any>(null)
 *
 *   // Fetch invitation details on mount
 *   useEffect(() => {
 *     authClient.admin.getInvitation({ token })
 *       .then(setInvitation)
 *       .catch(() => setError('Invalid or expired invitation'))
 *   }, [token])
 *
 *   const handleAccept = async (values: AcceptInviteFormValues) => {
 *     const result = await authClient.admin.acceptInvitation({
 *       token,
 *       name: values.name,
 *       password: values.password,
 *     })
 *     if (result.error) {
 *       setError(result.error.message)
 *     } else {
 *       // Redirect to admin
 *     }
 *   }
 *
 *   return (
 *     <AcceptInviteForm
 *       onSubmit={handleAccept}
 *       email={invitation?.email}
 *       error={error}
 *     />
 *   )
 * }
 * ```
 */
export function AcceptInviteForm({
  onSubmit,
  email,
  className,
  error,
  minPasswordLength = 8,
}: AcceptInviteFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={handleFormSubmit} className={cn("space-y-4", className)}>
      <FieldGroup>
        {/* Email Display (read-only) */}
        {email && (
          <Field>
            <FieldLabel>Email</FieldLabel>
            <FieldContent>
              <Input type="email" value={email} disabled className="bg-muted" />
              <FieldDescription>
                This is the email address associated with your invitation
              </FieldDescription>
            </FieldContent>
          </Field>
        )}

        {/* Name Field */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="accept-name">Your Name</FieldLabel>
          <FieldContent>
            <div className="relative">
              <User
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="accept-name"
                type="text"
                placeholder="Enter your name"
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

        {/* Password Field */}
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="accept-password">Password</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Lock
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="accept-password"
                type="password"
                placeholder="Create a password"
                className="pl-8"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: minPasswordLength,
                    message: `Password must be at least ${minPasswordLength} characters`,
                  },
                })}
              />
            </div>
            <FieldDescription>
              Must be at least {minPasswordLength} characters
            </FieldDescription>
            <FieldError>{errors.password?.message}</FieldError>
          </FieldContent>
        </Field>

        {/* Confirm Password Field */}
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="accept-confirm-password">
            Confirm Password
          </FieldLabel>
          <FieldContent>
            <div className="relative">
              <Lock
                className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2"
                weight="duotone"
              />
              <Input
                id="accept-confirm-password"
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
          "Create Account"
        )}
      </Button>
    </form>
  );
}
