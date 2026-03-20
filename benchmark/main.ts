import { InnerHTMLButton } from './components/InnerHTMLButton'
import { DrawButton } from './components/DrawButton'

// Register components
InnerHTMLButton.register('benchmark-innerhtml-btn')
DrawButton.register('benchmark-draw-btn')

// DOM Elements
const elementCountInput = document.getElementById('element-count') as HTMLInputElement
const iterationsInput = document.getElementById('iterations') as HTMLInputElement
const runButton = document.getElementById('run-benchmark') as HTMLButtonElement
const clearButton = document.getElementById('clear-results') as HTMLButtonElement

const innerHTMLTimeEl = document.getElementById('innerHTML-time') as HTMLDivElement
const drawTimeEl = document.getElementById('draw-time') as HTMLDivElement
const differenceEl = document.getElementById('difference') as HTMLDivElement
const comparisonTextEl = document.getElementById('comparison-text') as HTMLDivElement
const resultsContainer = document.getElementById('results-container') as HTMLDivElement
const noResultsEl = document.getElementById('no-results') as HTMLDivElement

const innerHTMLContainer = document.getElementById('innerHTML-container') as HTMLDivElement
const drawContainer = document.getElementById('draw-container') as HTMLDivElement

// Benchmark Configuration
interface BenchmarkConfig {
  elementCount: number
  iterations: number
}

interface BenchmarkResult {
  innerHTML: number
  draw: number
  difference: number
  faster: 'innerHTML' | 'draw'
}

// Create sample buttons for preview
function createPreviewButtons() {
  innerHTMLContainer.innerHTML = ''
  drawContainer.innerHTML = ''
  
  const variants = ['default', 'primary', 'secondary', 'success', 'danger']
  const sizes = ['xs', 'sm', 'md', 'lg']
  
  for (let i = 0; i < 5; i++) {
    const variant = variants[i % variants.length]
    const size = sizes[i % sizes.length]
    
    const btn1 = document.createElement('benchmark-innerhtml-btn') as any
    btn1.setAttribute('color', variant)
    btn1.setAttribute('size', size)
    btn1.textContent = `Button ${i + 1}`
    innerHTMLContainer.appendChild(btn1)
    
    const btn2 = document.createElement('benchmark-draw-btn') as any
    btn2.setAttribute('color', variant)
    btn2.setAttribute('size', size)
    btn2.textContent = `Button ${i + 1}`
    drawContainer.appendChild(btn2)
  }
}

// Benchmark functions
async function benchmarkInnerHTML(config: BenchmarkConfig): Promise<number> {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)
  
  const times: number[] = []
  
  for (let iter = 0; iter < config.iterations; iter++) {
    container.innerHTML = ''
    
    const start = performance.now()
    
    for (let i = 0; i < config.elementCount; i++) {
      const btn = document.createElement('benchmark-innerhtml-btn') as any
      btn.setAttribute('color', i % 2 === 0 ? 'primary' : 'secondary')
      btn.setAttribute('size', 'md')
      btn.setAttribute('disabled', i % 3 === 0 ? 'true' : 'false')
      btn.textContent = `Button ${i}`
      container.appendChild(btn)
    }
    
    // Force reflow to ensure rendering is complete
    container.offsetHeight
    
    const end = performance.now()
    times.push(end - start)
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  
  document.body.removeChild(container)
  
  // Return average time
  return times.reduce((a, b) => a + b, 0) / times.length
}

async function benchmarkDraw(config: BenchmarkConfig): Promise<number> {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)
  
  const times: number[] = []
  
  for (let iter = 0; iter < config.iterations; iter++) {
    container.innerHTML = ''
    
    const start = performance.now()
    
    for (let i = 0; i < config.elementCount; i++) {
      const btn = document.createElement('benchmark-draw-btn') as any
      btn.setAttribute('color', i % 2 === 0 ? 'primary' : 'secondary')
      btn.setAttribute('size', 'md')
      btn.setAttribute('disabled', i % 3 === 0 ? 'true' : 'false')
      btn.textContent = `Button ${i}`
      container.appendChild(btn)
    }
    
    // Force reflow to ensure rendering is complete
    container.offsetHeight
    
    const end = performance.now()
    times.push(end - start)
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  
  document.body.removeChild(container)
  
  // Return average time
  return times.reduce((a, b) => a + b, 0) / times.length
}

// Run benchmark
async function runBenchmark() {
  const config: BenchmarkConfig = {
    elementCount: parseInt(elementCountInput.value),
    iterations: parseInt(iterationsInput.value),
  }
  
  runButton.disabled = true
  runButton.textContent = 'Running...'
  clearButton.disabled = true
  
  try {
    // Warm up
    await benchmarkInnerHTML({ elementCount: 10, iterations: 1 })
    await benchmarkDraw({ elementCount: 10, iterations: 1 })
    
    // Run actual benchmark
    const innerHTMLTime = await benchmarkInnerHTML(config)
    const drawTime = await benchmarkDraw(config)
    
    const result: BenchmarkResult = {
      innerHTML: innerHTMLTime,
      draw: drawTime,
      difference: Math.abs(innerHTMLTime - drawTime),
      faster: innerHTMLTime < drawTime ? 'innerHTML' : 'draw',
    }
    
    displayResults(result)
  } catch (error) {
    console.error('Benchmark failed:', error)
    alert('Benchmark failed. Check console for details.')
  } finally {
    runButton.disabled = false
    runButton.textContent = 'Run Benchmark'
    clearButton.disabled = false
  }
}

// Display results
function displayResults(result: BenchmarkResult) {
  noResultsEl.style.display = 'none'
  resultsContainer.style.display = 'block'
  
  innerHTMLTimeEl.textContent = result.innerHTML.toFixed(2)
  innerHTMLTimeEl.className = `result-value ${result.faster === 'innerHTML' ? 'winner' : 'loser'}`
  
  drawTimeEl.textContent = result.draw.toFixed(2)
  drawTimeEl.className = `result-value ${result.faster === 'draw' ? 'winner' : 'loser'}`
  
  const percentDiff = ((result.difference / Math.max(result.innerHTML, result.draw)) * 100).toFixed(1)
  differenceEl.textContent = `${result.faster === 'innerHTML' ? '-' : '+'}${percentDiff}%`
  differenceEl.className = `result-value ${result.faster === 'draw' ? 'winner' : 'loser'}`
  
  const fasterMethod = result.faster === 'innerHTML' ? 'innerHTML' : 'ElementBuilder.draw()'
  const slowerMethod = result.faster === 'innerHTML' ? 'ElementBuilder.draw()' : 'innerHTML'
  
  comparisonTextEl.innerHTML = `
    <strong>${fasterMethod}</strong> is approximately <strong>${percentDiff}%</strong> faster than ${slowerMethod} 
    for initial rendering of ${parseInt(elementCountInput.value)} elements 
    (averaged over ${parseInt(iterationsInput.value)} iterations).
  `
}

// Clear results
function clearResults() {
  resultsContainer.style.display = 'none'
  noResultsEl.style.display = 'block'
  innerHTMLTimeEl.textContent = '-'
  drawTimeEl.textContent = '-'
  differenceEl.textContent = '-'
}

// Event listeners
runButton.addEventListener('click', runBenchmark)
clearButton.addEventListener('click', clearResults)

// Initialize preview
createPreviewButtons()

// Update preview when inputs change
;[elementCountInput, iterationsInput].forEach(input => {
  input.addEventListener('change', createPreviewButtons)
})

console.log('Benchmark ready! Click "Run Benchmark" to start.')
