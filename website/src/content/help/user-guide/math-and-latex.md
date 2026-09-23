# Math & LaTeX

Noether provides full mathematical typesetting with KaTeX rendering, visual MathLive chips, and a built-in symbol keyboard.

## 1. Writing Formulas
---

You can write math expressions in two ways:

- **Inline Math**: Wrap expressions in single dollar signs: `$E = mc^2$` renders inline as $E = mc^2$.
- **Display Math Blocks**: Wrap multi-line equations in double dollar signs:

```latex
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

In Live Preview, formulas render immediately with sharp mathematical typography.

## 2. Visual Math Keyboard & MathLive Chips
---

If you don't know the exact LaTeX syntax for a symbol, you don't have to look it up in a manual:

- **Click to Edit**: Clicking any rendered formula in Live Preview opens the **MathLive Chip Editor**, allowing visual editing with immediate visual feedback.
- **Visual Keyboard**: Click the keyboard icon on any math chip to open the **Visual Math Keyboard**, which organizes symbols into 4 categories:
  1. **`123` (Arithmetic & Calculus)**: Fractions, exponents, square roots, integrals ($\int$), summations ($\sum$), limits ($\lim$), and trigonometric functions ($\sin, \cos, \tan$).
  2. **`∞≠∈` (Symbols & Logic)**: Set theory ($\cap, \cup, \subset, \in$), comparisons ($\neq, \leq, \geq, \approx$), logical connectives ($\land, \lor, \implies, \iff$), and directional arrows ($\rightarrow, \Rightarrow$).
  3. **`abc` (Algebraic Variables)**: Standard math variables and characters.
  4. **`αβγ` (Greek Alphabet)**: Complete Greek letters ($\alpha, \beta, \gamma, \delta, \theta, \lambda, \mu, \pi, \sigma, \omega, \Delta, \Omega$).

Clicking any symbol inserts it directly into your formula at the cursor position.

## 3. LaTeX Math Cheat Sheet
---

Common mathematical expressions you can write in Noether:

| Expression | LaTeX Syntax | Rendered Output |
| :--- | :--- | :--- |
| **Fractions** | `\frac{a}{b}` | $\frac{a}{b}$ |
| **Square Root** | `\sqrt{x^2 + y^2}` | $\sqrt{x^2 + y^2}$ |
| **Summation** | `\sum_{i=1}^n i` | $\sum_{i=1}^n i$ |
| **Limits** | `\lim_{x \to 0} \frac{\sin x}{x} = 1` | $\lim_{x \to 0} \frac{\sin x}{x} = 1$ |
| **Greek Letters** | `\alpha, \beta, \gamma, \theta, \lambda` | $\alpha, \beta, \gamma, \theta, \lambda$ |
| **Matrices** | `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` | $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ |

## 4. Next Steps
---

- Return to [[Editor]] for mode switching and options.
- Review text styling in [[Basic Formatting]].
- Build structured tables with [[Tables]].
