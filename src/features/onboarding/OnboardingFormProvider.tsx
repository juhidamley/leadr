import { createContext, type Dispatch, type PropsWithChildren, type SetStateAction, use, useState } from 'react'

type OnboardingFormState = {
  handle: string
  careerGoal: string
  targetRole: string
  phone: string | null
}

type OnboardingFormContextValue = {
  form: OnboardingFormState
  setForm: Dispatch<SetStateAction<OnboardingFormState>>
}

const initialForm: OnboardingFormState = {
  handle: '',
  careerGoal: '',
  targetRole: '',
  phone: null,
}

const OnboardingFormContext = createContext<OnboardingFormContextValue | null>(null)

export function OnboardingFormProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [form, setForm] = useState<OnboardingFormState>(initialForm)

  return <OnboardingFormContext value={{ form, setForm }}>{children}</OnboardingFormContext>
}

export function useOnboardingForm(): OnboardingFormContextValue {
  const value = use(OnboardingFormContext)

  if (!value) {
    throw new Error('useOnboardingForm must be used within an OnboardingFormProvider')
  }

  return value
}
