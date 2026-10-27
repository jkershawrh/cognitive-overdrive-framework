import type { StoryPackage } from './types'
import { projects } from './projects'
export const story: StoryPackage = {
  id: 'cognitive-overdrive', title: 'Cognitive Overdrive', author: 'Jonathan Kershaw', role: 'Demo engineer. Systems thinker. Storyteller.',
  statement: 'I turn complex technology into experiences people understand, trust, and can use.', contactUrl: 'https://github.com/jkershawrh', projects,
  chapters: [
    {id:'possibility',title:'The possibility',myth:'The ordinary world',label:'Make it click.',note:'Start with the human problem. Powerful technology is only the beginning; the audience needs to see what changes for them.',narration:'01-possibility'},
    {id:'decision',title:'The decision',myth:'The call to adventure',label:'Meet the room.',note:'Choose a lens. Ask what decision this room needs to make. The system stays the same; the entry point and evidence emphasis change.',narration:'02-decision'},
    {id:'work',title:'The work',myth:'Meeting the guide',label:'Show the craft.',note:'Choose one case and connect the problem to what was built, how people consume it, and what can be reused. Source review is not a production claim.',narration:'03-work'},
    {id:'architecture',title:'The architecture',myth:'Crossing the threshold',label:'Earn every box.',note:'Pause on the audience question, then reveal the technical answer. Trace the actual boundary and protocol; let the mechanism earn belief.',narration:'04-architecture'},
    {id:'proof',title:'The proof',myth:'The trials',label:'Challenge the claim.',note:'This is a local simulation. Run the normal condition, then remove evidence or authority. Explain why the decision changes. No model or backend runs.',narration:'05-proof'},
    {id:'multiplier',title:'The multiplier',myth:'The reward',label:'Build it to travel.',note:'Show the handoff beyond the original presenter: self-guided experience, reusable contract, documented lab, and observable limitation.',narration:'06-multiplier'},
    {id:'return',title:'The return',myth:'Return with the elixir',label:'Leave with clarity.',note:'Recap only the evidence collected in this session. Invite a guided walkthrough of one source-backed project and a concrete customer decision.',narration:'07-return'},
  ],
  audiences: [
    {id:'executive',name:'C-suite',role:'See the business decision',question:'What becomes possible—and what would it take?',promise:'Begin with the business constraint. Make the value mechanism, risk, and next decision clear.',deliverable:'An executive briefing with a credible proof point and explicit limits.',projectIds:['cost-aware','edge','launchpad']},
    {id:'architect',name:'Solution architects',role:'Understand the system',question:'How does it work, and where are the boundaries?',promise:'Trace a request from intent to evidence. Inspect interfaces, deployment choices, and operational tradeoffs.',deliverable:'A guided architecture, inspectable source, and a path into hands-on work.',projectIds:['triforce','praxis','stargate']},
    {id:'sales',name:'Sales',role:'Make the value tangible',question:'Can the customer see their own problem in the story?',promise:'Turn discovery into a recognizable scenario. Show the proof moment, handle the objection, and name a next step.',deliverable:'A repeatable demonstration built around a customer decision.',projectIds:['cost-aware','sovereign','virtualization']},
    {id:'internal',name:'Internal teams',role:'Make the work reusable',question:'Can someone else take this forward without starting over?',promise:'Package the narrative, contracts, environments, and evidence so the capability can travel across the organization.',deliverable:'A reusable story package, documented workflow, and honest rehearsal mode.',projectIds:['launchpad','praxis','agentic']},
  ],
}
