import { AeicoElement, html } from 'aeico'

export class HelloWorld extends AeicoElement {
  render() {
    return html(({ h1 }) => {
      h1({ textContent: 'Hello, World!' })
    })
  }
}
