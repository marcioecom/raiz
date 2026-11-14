import type { ComponentProps } from "react"
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form"

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useState,
} from "react"
import { Controller, FormProvider, useFormContext, useFormState } from "react-hook-form"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const Form = FormProvider

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null)

interface FormItemContextValue {
  id: string
  hasDescription: boolean
  setHasDescription: (value: boolean) => void
}

const FormItemContext = createContext<FormItemContextValue | null>(null)

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState } = useFormContext()

  if (!fieldContext || !itemContext) {
    throw new Error("useFormField must be used within <FormField> and <FormItem>")
  }

  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)
  const { id, hasDescription, setHasDescription } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-control`,
    formDescriptionId: `${id}-description`,
    formMessageId: `${id}-message`,
    hasDescription,
    setHasDescription,
    ...fieldState,
  }
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  const id = useId()
  const [hasDescription, setHasDescription] = useState(false)

  return (
    <FormItemContext.Provider value={{ id, hasDescription, setHasDescription }}>
      <div className={cn("flex flex-col gap-1.5", className)} {...props} />
    </FormItemContext.Provider>
  )
}

export function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { formItemId } = useFormField()
  return <Label htmlFor={formItemId} className={className} {...props} />
}

/**
 * Dica posicionada ACIMA do campo para nunca ser encoberta pelo teclado móvel ou autofill.
 */
export function FormDescription({ className, ...props }: ComponentProps<"p">) {
  const { formDescriptionId, setHasDescription } = useFormField()

  useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])

  return (
    <p
      id={formDescriptionId}
      className={cn("text-[13px] font-medium leading-[18px] text-ink-muted", className)}
      {...props}
    />
  )
}

interface ControlChildProps {
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}

export function FormControl({ children }: { children: React.ReactNode }) {
  const { error, formItemId, formDescriptionId, formMessageId, hasDescription } = useFormField()

  if (!isValidElement<ControlChildProps>(children)) {
    return <>{children}</>
  }

  const childDescribedBy = children.props["aria-describedby"]
  const ids = [
    hasDescription ? formDescriptionId : undefined,
    error ? formMessageId : undefined,
    childDescribedBy,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")

  return cloneElement(children, {
    id: children.props.id ?? formItemId,
    "aria-describedby": ids.length > 0 ? ids : undefined,
    "aria-invalid": error ? "true" : "false",
  })
}

export function FormMessage({ className, children, ...props }: ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      id={formMessageId}
      className={cn("text-sm font-medium leading-5 text-error", className)}
      {...props}
    >
      {body}
    </p>
  )
}
