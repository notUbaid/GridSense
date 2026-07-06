# GridSense - AI Coding Guidelines

These guidelines dictate the behavior and engineering standards for any AI agent working on the GridSense project. 
GridSense is being built as a top-tier submission for the GrowEasy Software Developer Internship. Every decision must prioritize quality, readability, and production readiness.

## 1. Quality Over Speed
- Optimize for correctness, maintainability, and engineering quality over minimizing tokens or speed.
- Do not take shortcuts. If a deeper analysis or more thorough implementation is beneficial, prefer the higher-quality solution.
- Aim to stand out from 100 other submissions. If an additional feature or polish (e.g., edge case handling, animations, robust error boundaries) adds significant value without jeopardizing the core requirements, implement it.

## 2. Incremental Development
- Break development into small, logical phases.
- Do not attempt to build the entire application in a single response.
- Complete a subsystem thoroughly, verify it, and wait for approval before moving to the next phase.

## 3. Think Before Writing Code
- Understand the requirement completely.
- Consider multiple approaches and explain important architectural decisions.
- Identify edge cases (e.g., malformed data, rate limits, network failures).

## 4. Depth Over Breadth
- Implement features completely.
- NO placeholder code. NO "TODOs" unless explicitly requested by the user.
- NO "we'll handle this later" for functionality required in the current phase.

## 5. Engineering Standards
- **Architecture**: Enforce a strict separation of concerns (e.g., AI Provider abstractions, clear route/controller/service layers).
- **TypeScript**: Strict typing everywhere. Never use `any`. Use `unknown` if necessary and validate via Zod.
- **Validation**: Validate all inputs at the API boundary using Zod.
- **Error Handling**: Use exponential backoff for external APIs (Groq, etc.). Catch, log (using Pino), and gracefully surface errors to the UI.
- **UI/UX**: Prioritize a premium user experience using shadcn/ui, Tailwind CSS, and Framer Motion (or simple CSS animations). Handle empty states, loading states, and error states elegantly.
- **Scalability**: Design systems that can easily evolve into a standalone SaaS product.

## 6. Challenge Existing Ideas
- Do not blindly implement suggestions if a better alternative exists.
- Push back on decisions that negatively impact scalability, maintainability, security, or performance. Act as a senior technical partner.
