import { AeicoElement, html } from 'aeico'

export class Counter extends AeicoElement {
  static props = {
    count: { type: Number },
  }

  constructor() {
    super()
    this.count = 0
  }

  render() {
    return html(({ div, button, span }) => {
      div({}, () => {
        button({ '@click': () => { this.count-- }, textContent: '-' })
        span({ textContent: String(this.count) })
        button({ '@click': () => { this.count++ }, textContent: '+' })
      })
    })
  }
}
