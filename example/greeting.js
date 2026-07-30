import { AeicoElement, html } from 'aeico'

export class Greeting extends AeicoElement {
  static props = {
    name: { type: String },
  }

  constructor() {
    super()
    this.name = 'User'
  }

  render() {
    return html(({ p }) => {
      p({ textContent: `Welcome, ${this.name}!` })
    })
  }
}
