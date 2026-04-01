export type SliderOptionValue = string | number

export type SliderOption = {
  label: string
  value: SliderOptionValue
}

export type SliderOptions = SliderOptionValue[] | SliderOption[]

export type NormalizedOption = {
  label: string
  value: string      // stored as string for consistency with this.value
  rangeValue: number // numeric value used by the range input
}
