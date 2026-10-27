import type { Project, StoryPackage } from '../src/framework'

// Illustrative authoring content. Replace it with your own reviewed evidence.
const project: Project = {
  id: 'example-contract',
  title: 'A request made understandable',
  category: 'Enablement',
  kicker: 'One clear boundary',
  summary: 'Explain one request, one decision and the evidence a reviewer needs.',
  audience: 'A customer team evaluating one bounded workflow.',
  built: 'Illustrative case content. Replace this with a specific implemented capability.',
  workflow: 'Inspect input, review the contract, examine the outcome and decide the next step.',
  consumed: 'A guided walkthrough with a documented handoff. No live service is connected.',
  reuse: 'The question, contract and evidence pattern can support another audience or domain.',
  maturity: 'Authoring example',
  accent: '#d7f44c',
  tags: ['Contracts', 'Learning design'],
}

export const story: StoryPackage = {
  id: 'my-next-story',
  title: 'A story worth acting on',
  author: 'Your team',
  role: 'The guide to a clear technical decision.',
  statement: 'Understand the mechanism. Inspect the evidence. Choose the next step.',
  // Replace this with the appropriate public contact before sharing.
  contactUrl: 'https://github.com/jkershawrh',
  projects: [project],
  chapters: [
    { id: 'possibility', title: 'The possibility', myth: 'The ordinary world', label: 'Start with the person.', note: 'Describe one recognizable problem before naming the technology.', narration: 'example-01' },
    { id: 'decision', title: 'The decision', myth: 'The call to adventure', label: 'Name the decision.', note: 'Choose the audience lens and the decision that matters to them.', narration: 'example-02' },
    { id: 'work', title: 'The work', myth: 'Meeting the guide', label: 'Show a capability.', note: 'Inspect what exists, how it is consumed and what remains unqualified.', narration: 'example-03' },
    { id: 'architecture', title: 'The architecture', myth: 'Crossing the threshold', label: 'Reveal the boundary.', note: 'Replace the default Triforce walkthrough with the relevant system view.', narration: 'example-04' },
    { id: 'proof', title: 'The proof', myth: 'The trials', label: 'Change a condition.', note: 'Use a controlled comparison and preserve the source state of each result.', narration: 'example-05' },
    { id: 'multiplier', title: 'The multiplier', myth: 'The reward', label: 'Make it reusable.', note: 'Show the next team what they receive and what they must qualify.', narration: 'example-06' },
    { id: 'return', title: 'The return', myth: 'Return with the elixir', label: 'Choose the next step.', note: 'Close with the evidence actually seen and one concrete commitment.', narration: 'example-07' },
  ],
  audiences: [
    { id: 'executive', name: 'C-suite', role: 'Business decision', question: 'What should we validate next?', promise: 'Connect the problem to a bounded proof.', deliverable: 'One explicit decision and its evidence needs.', projectIds: [project.id] },
    { id: 'architect', name: 'Solution architects', role: 'System understanding', question: 'Which boundary makes this work?', promise: 'Trace the request and its failure conditions.', deliverable: 'A contract and an inspectable system view.', projectIds: [project.id] },
    { id: 'sales', name: 'Sales', role: 'Customer conversation', question: 'Can the customer recognize their problem?', promise: 'Make the scenario concrete and test one objection.', deliverable: 'A repeatable demonstration and next step.', projectIds: [project.id] },
    { id: 'internal', name: 'Internal teams', role: 'Reusable capability', question: 'Can another team carry this forward?', promise: 'Name the assets, responsibilities and remaining gates.', deliverable: 'A documented handoff.', projectIds: [project.id] },
  ],
}
