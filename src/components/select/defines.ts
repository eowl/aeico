export type SelectOptionValue = string | number

export type SelectOption = {
  label: string
  value: SelectOptionValue
}

export type SelectOptions = SelectOptionValue[] | SelectOption[]