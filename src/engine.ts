export type Axis = 'solidarity' | 'obedience' | 'honesty';
export type ChoiceKind = 'normal' | 'warning' | 'ink' | 'crossed';
export interface Choice { id:string; label:string; hint:string; axis?:Axis; delta?:number; kind:ChoiceKind; next:string; requires?:Partial<Record<Axis, number>>; cost?:number; contradiction?:boolean; }
export interface Scene { id:string; chapter:string; kicker:string; title:string; body:string[]; note?:string; choices:Choice[]; }
export interface GameState { sceneId:string; turn:number; ink:number; stats:Record<Axis,number>; crossed:Set<string>; restored:Set<string>; contradiction:boolean; ended?:string; }
export const AXES: {key:Axis; left:string; right:string}[] = [
 {key:'solidarity',left:'연대',right:'이용'}, {key:'obedience',left:'복종',right:'저항'}, {key:'honesty',left:'정직',right:'기만'}
];
export function initialState():GameState { return {sceneId:'wake',turn:0,ink:3,stats:{solidarity:0,obedience:0,honesty:0},crossed:new Set(),restored:new Set(),contradiction:false}; }
export function choiceKind(state:GameState, choice:Choice):ChoiceKind { if(state.crossed.has(choice.id)) return 'crossed'; if(choice.requires && Object.entries(choice.requires).some(([k,v]) => state.stats[k as Axis] < v!)) return 'warning'; return choice.kind; }
export function applyEditorialRules(state:GameState):GameState { const next={...state,crossed:new Set(state.crossed),restored:new Set(state.restored)}; if(next.sceneId==='crossing'){ if(next.stats.solidarity>=2) next.crossed.add('crossing-use'); if(next.stats.solidarity<=-2) next.crossed.add('crossing-care'); } return next; }
export function choose(state:GameState, choice:Choice):GameState { const kind=choiceKind(state,choice); if(kind==='crossed' || (kind==='ink' && state.ink < (choice.cost||1))) return state; const next:GameState={...state,stats:{...state.stats},crossed:new Set(state.crossed),restored:new Set(state.restored),turn:state.turn+1,sceneId:choice.next}; if(choice.axis) next.stats[choice.axis]+=choice.delta||0; if(kind==='ink') next.ink-=(choice.cost||1); if(choice.contradiction) next.contradiction=true; return applyEditorialRules(next); }
export function restoreChoice(state:GameState, choiceId:string):GameState { if(state.ink<1 || !state.crossed.has(choiceId) || state.restored.has(choiceId)) return state; const crossed=new Set(state.crossed); crossed.delete(choiceId); const restored=new Set(state.restored); restored.add(choiceId); return {...state,ink:state.ink-1,crossed,restored,contradiction:true}; }
export function ending(state:GameState):string|undefined { if(state.sceneId!=='end') return undefined; if(state.contradiction && Math.abs(state.stats.solidarity)+Math.abs(state.stats.obedience)+Math.abs(state.stats.honesty)<=3) return 'human'; if(state.stats.obedience>=3) return 'approved'; if(state.stats.solidarity>=3) return 'margin'; return 'erased'; }
export function serialize(state:GameState){return JSON.stringify({...state,crossed:[...state.crossed],restored:[...state.restored]});}
export function deserialize(raw:string):GameState { const v=JSON.parse(raw); return {...v,crossed:new Set(v.crossed),restored:new Set(v.restored)}; }
