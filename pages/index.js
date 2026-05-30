import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import {
  SECTIONS, IMPORTANCE_LABELS, TOTAL_QUESTIONS,
  PRESET_RACES, TEST_ANSWERS, TEST_IMPORTANCE, buildProfileText
} from "../lib/data";

const STORAGE_KEY = "voter-guide-v2";

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(_) { return null; }
}
function saveState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(_) {}
}
function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
}

// ── API call (streaming) ──────────────────────────────────────────────────────
async function callClaudeStream(prompt, onChunk) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "API error");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }
  return full;
}

function parseSection(text, key) {
  const regex = new RegExp(`${key}:([\\s\\S]*?)(?=\\n[A-Z]+:|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

// ── Question components ───────────────────────────────────────────────────────
function ScaleQuestion({ question, value, onChange }) {
  return (
    <div style={{marginBottom:"1.5rem"}}>
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1a1a2e",marginBottom:"1rem",lineHeight:1.5}}>{question.text}</p>
      <div style={{display:"flex",gap:"0.5rem",alignItems:"flex-start",marginBottom:"0.75rem"}}>
        <span style={{fontSize:"0.72rem",color:"#6b7280",flex:1,textAlign:"left",lineHeight:1.4}}>{question.left}</span>
        <span style={{fontSize:"0.72rem",color:"#6b7280",flex:1,textAlign:"right",lineHeight:1.4}}>{question.right}</span>
      </div>
      <div style={{display:"flex",gap:"0.4rem",justifyContent:"center"}}>
        {[1,2,3,4,5,6,7].map(v=>(
          <button key={v} onClick={()=>onChange(v)} style={{width:v===4?"2.2rem":"2rem",height:v===4?"2.2rem":"2rem",borderRadius:"50%",border:value===v?"2px solid #c84b31":"2px solid #d1d5db",background:value===v?"#c84b31":v===4?"#f3f4f6":"white",cursor:"pointer",fontSize:"0.65rem",color:value===v?"white":"#9ca3af",fontWeight:"bold"}}>
            {v===1?"←":v===7?"→":v===4?"·":""}
          </button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.25rem"}}>
        <span style={{fontSize:"0.65rem",color:"#9ca3af"}}>Strongly left</span>
        <span style={{fontSize:"0.65rem",color:"#9ca3af"}}>Center</span>
        <span style={{fontSize:"0.65rem",color:"#9ca3af"}}>Strongly right</span>
      </div>
    </div>
  );
}

function ChoiceQuestion({ question, value, onChange }) {
  return (
    <div style={{marginBottom:"1.5rem"}}>
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1a1a2e",marginBottom:"0.75rem",lineHeight:1.5}}>{question.text}</p>
      <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
        {question.options.map((opt,i)=>(
          <button key={i} onClick={()=>onChange(i)} style={{padding:"0.65rem 1rem",borderRadius:"8px",border:value===i?"2px solid #c84b31":"2px solid #e5e7eb",background:value===i?"#fff5f3":"white",cursor:"pointer",textAlign:"left",fontSize:"0.85rem",color:value===i?"#c84b31":"#374151",lineHeight:1.4}}>
            {value===i?"▸ ":"  "}{opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImportanceSelector({ value, onChange }) {
  return (
    <div style={{marginBottom:"0.75rem"}}>
      <p style={{fontSize:"0.75rem",color:"#6b7280",marginBottom:"0.4rem"}}>How important is this topic to you?</p>
      <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
        {IMPORTANCE_LABELS.map((label,i)=>(
          <button key={i} onClick={()=>onChange(i)} style={{padding:"0.25rem 0.6rem",borderRadius:"20px",border:value===i?"1.5px solid #1a1a2e":"1.5px solid #e5e7eb",background:value===i?"#1a1a2e":"white",color:value===i?"white":"#6b7280",fontSize:"0.72rem",cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── CandidateCard ─────────────────────────────────────────────────────────────
function CandidateCard({ name, rank, result, candidate, scoreColor, partyColor, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const summary  = result.summary  || parseSection(result.text, "SUMMARY");
  const aligns   = result.aligns   || parseSection(result.text, "ALIGNS");
  const diverges = result.diverges || parseSection(result.text, "DIVERGES");
  const watchfor = result.watchfor || parseSection(result.text, "WATCHFOR");

  return (
    <div style={{background:"white",borderRadius:"14px",marginBottom:"1rem",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
      <div onClick={()=>setExpanded(e=>!e)} style={{padding:"1.1rem 1.25rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.75rem"}}>
        <div style={{width:"1.75rem",height:"1.75rem",borderRadius:"50%",background:rank===0?"#c84b31":rank===1?"#d97706":rank===2?"#6b7280":"#f3f4f6",color:rank<=2?"white":"#9ca3af",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:"bold",flexShrink:0}}>
          {rank+1}
        </div>
        <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"50%",border:`3px solid ${scoreColor(result.score)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:"0.75rem",fontWeight:"bold",color:scoreColor(result.score)}}>{result.score}%</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.4rem",flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1rem",color:"#1a1a2e",fontWeight:600}}>{name}</span>
            {candidate.party && (
              <span style={{fontSize:"0.65rem",padding:"0.15rem 0.4rem",borderRadius:"4px",background:partyColor(candidate.party),color:"white"}}>
                {candidate.party==="D"?"Democrat":candidate.party==="R"?"Republican":"Ind."}
              </span>
            )}
          </div>
          {summary && <p style={{fontSize:"0.78rem",color:"#6b7280",margin:"0.15rem 0 0",lineHeight:1.4}}>{summary}</p>}
        </div>
        <span style={{color:"#9ca3af",fontSize:"0.85rem",flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{padding:"0 1.25rem 1.25rem",borderTop:"1px solid #f3f4f6"}}>
          {(aligns||diverges||watchfor) ? (
            <>
              {aligns && <div style={{marginTop:"1rem"}}>
                <p style={{fontSize:"0.72rem",fontWeight:600,color:"#16a34a",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.4rem"}}>Where you align</p>
                <div style={{fontSize:"0.84rem",color:"#374151",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{aligns}</div>
              </div>}
              {diverges && <div style={{marginTop:"0.9rem"}}>
                <p style={{fontSize:"0.72rem",fontWeight:600,color:"#dc2626",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.4rem"}}>Where you diverge</p>
                <div style={{fontSize:"0.84rem",color:"#374151",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{diverges}</div>
              </div>}
              {watchfor && <div style={{marginTop:"0.9rem",padding:"0.75rem",background:"#fefce8",borderRadius:"8px",borderLeft:"3px solid #d97706"}}>
                <p style={{fontSize:"0.72rem",fontWeight:600,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.4rem"}}>Research before deciding</p>
                <div style={{fontSize:"0.84rem",color:"#374151",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{watchfor}</div>
              </div>}
            </>
          ) : (
            <div style={{marginTop:"1rem",fontSize:"0.84rem",color:"#374151",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{result.text}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Profile Summary ───────────────────────────────────────────────────────────
function ProfileSummary({ answers, importance }) {
  const lines = [];
  if (answers.tax_philosophy!==undefined){const v=answers.tax_philosophy;lines.push(`Tax philosophy: ${v<=2?"Favors lower taxes and smaller government":v>=6?"Supports progressive taxation for public investment":"Moderate on taxation"}`);}
  if (answers.healthcare_system!==undefined){const opts=["fully private market","private with subsidies","mixed public option","universal single-payer"];lines.push(`Healthcare: Prefers ${opts[answers.healthcare_system]}`);}
  if (answers.climate_urgency!==undefined){const opts=["not a priority","a concern but economic caution","a serious issue requiring balanced policy","a crisis requiring urgent action"];lines.push(`Climate: Views it as ${opts[answers.climate_urgency]}`);}
  if (answers.immigration!==undefined){const v=answers.immigration;lines.push(`Immigration: ${v<=2?"Restrictionist":v>=6?"Pro-immigration and pathways":"Moderate/balanced"}`);}
  if (answers.top_issue!==undefined){const opts=["economy/jobs","healthcare","climate/environment","immigration","education","civil rights","foreign policy","democracy/governance"];lines.push(`Top priority issue: ${opts[answers.top_issue]}`);}
  if (answers.candidate_character!==undefined){const v=answers.candidate_character;lines.push(`Candidate evaluation: ${v>=5?"Character above policy":v<=3?"Policy above character":"Character and policy equally"}`);}
  if (answers.bipartisanship!==undefined){const v=answers.bipartisanship;lines.push(`Bipartisanship: ${v>=5?"Values compromise":"Values principled consistency"}`);}
  const topImp = Object.entries(importance).filter(([,v])=>v>=2).map(([k])=>k.replace(/_/g," "));

  return (
    <div style={{background:"#f9fafb",borderRadius:"12px",padding:"1.5rem",border:"1px solid #e5e7eb"}}>
      <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:"#1a1a2e",marginBottom:"1rem"}}>Your Values Profile</h3>
      {lines.length===0
        ?<p style={{color:"#9ca3af",fontSize:"0.85rem"}}>Complete the questionnaire to see your profile.</p>
        :<ul style={{listStyle:"none",padding:0,margin:0}}>{lines.map((l,i)=>(
          <li key={i} style={{fontSize:"0.85rem",color:"#374151",padding:"0.4rem 0",borderBottom:i<lines.length-1?"1px solid #f3f4f6":"none",lineHeight:1.5}}>
            <span style={{color:"#c84b31",marginRight:"0.5rem"}}>▸</span>{l}
          </li>
        ))}</ul>
      }
      {topImp.length>0&&<div style={{marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #e5e7eb"}}>
        <p style={{fontSize:"0.75rem",color:"#6b7280",marginBottom:"0.5rem"}}>High-priority topics:</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {topImp.map((t,i)=><span key={i} style={{background:"#1a1a2e",color:"white",fontSize:"0.72rem",padding:"0.2rem 0.6rem",borderRadius:"20px"}}>{t}</span>)}
        </div>
      </div>}
    </div>
  );
}

// ── Race Analyzer ─────────────────────────────────────────────────────────────
function RaceAnalyzer({ answers, importance }) {
  const [mode, setMode] = useState("preset");
  const [selectedRace, setSelectedRace] = useState(PRESET_RACES[0].id);
  const [customRaceName, setCustomRaceName] = useState("");
  const [customCandidates, setCustomCandidates] = useState([{name:"",note:""},{name:"",note:""}]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingName, setLoadingName] = useState("");

  const profileText = buildProfileText(answers, importance);
  const answeredCount = Object.keys(answers).length;
  const scoreColor = s => s>=65?"#16a34a":s>=40?"#d97706":"#dc2626";
  const partyColor = p => p==="D"?"#1d4ed8":p==="R"?"#dc2626":"#6b7280";

  const getCandidates = () => mode==="preset"
    ? PRESET_RACES.find(r=>r.id===selectedRace)?.candidates||[]
    : customCandidates.filter(c=>c.name.trim());

  const analyzeAll = async () => {
    setLoading(true); setResults({});
    const candidates = getCandidates();
    const raceName = mode==="preset" ? PRESET_RACES.find(r=>r.id===selectedRace)?.label : customRaceName;

    const candidateList = candidates.map(c =>
      `- ${c.name} (${c.party==="D"?"Democrat":c.party==="R"?"Republican":"Independent"})${c.note?`: ${c.note}`:""}`
    ).join("\n");

    const prompt = `You are a nonpartisan political analyst. Analyze ALL of these candidates against the voter's values profile in a single response.

RACE: ${raceName}

CANDIDATES:
${candidateList}

VOTER PROFILE (${answeredCount} questions answered):
${profileText}

Respond with ONLY a JSON array — no explanation, no markdown fences, just raw JSON. Include all ${candidates.length} candidates.

[{"name":"Candidate Name","score":72,"summary":"One sentence characterizing overall alignment.","aligns":["• Point one","• Point two","• Point three"],"diverges":["• Point one","• Point two"],"watchfor":["• Thing to research before deciding"]}]

Score is 1-100 alignment percentage. Be nonpartisan and evidence-based.`;

    try {
      // Parse candidates progressively as JSON objects complete in the stream
      const parsePartial = (text) => {
        const newResults = {};
        // Match each complete JSON object in the array
        const objectRegex = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*\}/g;
        let match;
        while ((match = objectRegex.exec(text)) !== null) {
          try {
            const obj = JSON.parse(match[0]);
            if (obj.name) {
              newResults[obj.name] = {
                text: "",
                score: obj.score || 50,
                summary: obj.summary || "",
                aligns: Array.isArray(obj.aligns) ? obj.aligns.join("\n") : obj.aligns || "",
                diverges: Array.isArray(obj.diverges) ? obj.diverges.join("\n") : obj.diverges || "",
                watchfor: Array.isArray(obj.watchfor) ? obj.watchfor.join("\n") : obj.watchfor || "",
              };
            }
          } catch(_) {}
        }
        return newResults;
      };

      await callClaudeStream(prompt, (partial) => {
        const parsed = parsePartial(partial);
        if (Object.keys(parsed).length > 0) {
          setResults(parsed);
        }
      });

    } catch(e) {
      const errResults = {};
      for (const c of candidates) errResults[c.name] = {text:String(e),score:0,error:true};
      setResults(errResults);
    }
    setLoadingName(""); setLoading(false);
  };

  const candidates = getCandidates();
  const sortedResults = [...Object.keys(results)].sort((a,b)=>(results[b]?.score||0)-(results[a]?.score||0));

  return (
    <div>
      <div style={{background:"white",borderRadius:"16px",padding:"1.5rem",marginBottom:"1.5rem",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
        <h3 style={{fontFamily:"'Playfair Display',serif",color:"#1a1a2e",fontSize:"1.1rem",marginBottom:"1rem"}}>Choose a Race to Analyze</h3>
        <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem"}}>
          {["preset","custom"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:"0.4rem 0.9rem",borderRadius:"20px",border:mode===m?"1.5px solid #1a1a2e":"1.5px solid #e5e7eb",background:mode===m?"#1a1a2e":"white",color:mode===m?"white":"#6b7280",fontSize:"0.78rem",cursor:"pointer"}}>
              {m==="preset"?"Featured Races":"Custom Race"}
            </button>
          ))}
        </div>

        {mode==="preset" && (
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {PRESET_RACES.map(race=>(
              <button key={race.id} onClick={()=>setSelectedRace(race.id)} style={{padding:"0.75rem 1rem",borderRadius:"10px",border:selectedRace===race.id?"2px solid #c84b31":"2px solid #e5e7eb",background:selectedRace===race.id?"#fff5f3":"white",cursor:"pointer",textAlign:"left",fontSize:"0.9rem",color:selectedRace===race.id?"#c84b31":"#374151",fontFamily:"'Playfair Display',serif"}}>
                {selectedRace===race.id?"▸ ":""}{race.label}
                <span style={{fontSize:"0.72rem",color:"#9ca3af",marginLeft:"0.5rem"}}>({race.candidates.length} candidates)</span>
              </button>
            ))}
          </div>
        )}

        {mode==="custom" && (
          <div>
            <input type="text" placeholder="Race name (e.g., 2026 Texas Senate)" value={customRaceName} onChange={e=>setCustomRaceName(e.target.value)}
              style={{width:"100%",padding:"0.65rem 1rem",borderRadius:"8px",border:"2px solid #e5e7eb",fontSize:"0.9rem",marginBottom:"1rem",boxSizing:"border-box"}}/>
            {customCandidates.map((c,i)=>(
              <div key={i} style={{marginBottom:"0.75rem",padding:"0.75rem",background:"#f9fafb",borderRadius:"10px"}}>
                <input type="text" placeholder={`Candidate ${i+1} name`} value={c.name} onChange={e=>{const n=[...customCandidates];n[i]={...n[i],name:e.target.value};setCustomCandidates(n);}}
                  style={{width:"100%",padding:"0.5rem 0.75rem",borderRadius:"6px",border:"1.5px solid #e5e7eb",fontSize:"0.85rem",marginBottom:"0.5rem",boxSizing:"border-box"}}/>
                <textarea placeholder="Optional: paste their bio, platform, or positions..." value={c.note} onChange={e=>{const n=[...customCandidates];n[i]={...n[i],note:e.target.value};setCustomCandidates(n);}} rows={2}
                  style={{width:"100%",padding:"0.5rem 0.75rem",borderRadius:"6px",border:"1.5px solid #e5e7eb",fontSize:"0.82rem",boxSizing:"border-box",resize:"vertical"}}/>
              </div>
            ))}
            <button onClick={()=>setCustomCandidates([...customCandidates,{name:"",note:""}])} style={{fontSize:"0.78rem",color:"#6b7280",background:"none",border:"1.5px dashed #d1d5db",borderRadius:"8px",padding:"0.4rem 0.8rem",cursor:"pointer",width:"100%"}}>
              + Add another candidate
            </button>
          </div>
        )}

        <button onClick={analyzeAll} disabled={loading||candidates.length===0}
          style={{marginTop:"1.25rem",background:loading||candidates.length===0?"#d1d5db":"#c84b31",color:"white",border:"none",borderRadius:"10px",padding:"0.75rem 1.5rem",fontSize:"0.95rem",fontFamily:"'Playfair Display',serif",cursor:loading||candidates.length===0?"not-allowed":"pointer",width:"100%"}}>
          {loading?`Analyzing all candidates…`:`Analyze ${candidates.length} Candidate${candidates.length!==1?"s":""} →`}
        </button>
      </div>

      {/* Skeleton cards */}
      {loading && candidates.map(c=>(
        !results[c.name] && (
          <div key={c.name} style={{background:"white",borderRadius:"14px",padding:"1.25rem",marginBottom:"1rem",opacity:0.5,display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <div style={{width:"1.75rem",height:"1.75rem",borderRadius:"50%",background:"#f3f4f6",flexShrink:0}}/>
            <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"50%",border:"3px solid #e5e7eb",flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{height:"0.9rem",width:"8rem",background:"#f3f4f6",borderRadius:"4px",marginBottom:"0.4rem"}}/>
              <div style={{height:"0.7rem",width:"5rem",background:"#f3f4f6",borderRadius:"4px"}}/>
            </div>
            <span style={{fontSize:"0.75rem",color:"#9ca3af"}}>{c.name===loadingName?"Analyzing…":"Waiting…"}</span>
          </div>
        )
      ))}

      {sortedResults.length>0 && (
        <>
          <h3 style={{fontFamily:"'Playfair Display',serif",color:"#1a1a2e",fontSize:"1rem",marginBottom:"0.75rem"}}>
            Results — ranked by alignment with your profile
          </h3>
          {sortedResults.map((name,rank)=>(
            <CandidateCard key={name} name={name} rank={rank} result={results[name]}
              candidate={candidates.find(c=>c.name===name)||{}} scoreColor={scoreColor} partyColor={partyColor} defaultExpanded={rank===0}/>
          ))}
        </>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState({});
  const [importance, setImportance] = useState({});
  const [view, setView] = useState("quiz");
  const [loaded, setLoaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(()=>{
    const state = loadState();
    if(state){
      setAnswers(state.answers||{});
      setImportance(state.importance||{});
      setCurrentSection(state.currentSection||0);
      setView(state.view||"quiz");
    }
    setLoaded(true);
  },[]);

  useEffect(()=>{
    if(!loaded) return;
    saveState({answers,importance,currentSection,view});
  },[answers,importance,currentSection,view,loaded]);

  const setAnswer=(qid,val)=>setAnswers(prev=>({...prev,[qid]:val}));
  const setImp=(qid,val)=>setImportance(prev=>({...prev,[qid]:val}));
  const handleReset=()=>{clearState();setAnswers({});setImportance({});setCurrentSection(0);setView("quiz");setShowResetConfirm(false);};

  const answeredQuestions=Object.keys(answers).length;
  const progress=Math.round((answeredQuestions/TOTAL_QUESTIONS)*100);
  const section=SECTIONS[currentSection];
  const sectionAnswered=section.questions.filter(q=>answers[q.id]!==undefined).length;

  if(!loaded) return null;

  return (
    <>
      <Head>
        <title>My Voting Guide</title>
        <meta name="description" content="A personalized voter values guide" />
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@300;400;600&display=swap" rel="stylesheet"/>
        <style>{`*{box-sizing:border-box;margin:0;padding:0}body{background:#f8f6f1;font-family:'Source Serif 4',serif}`}</style>
      </Head>

      <div style={{minHeight:"100vh",background:"#f8f6f1"}}>
        {/* Header */}
        <div style={{background:"#1a1a2e",padding:"1.25rem 1.5rem",position:"sticky",top:0,zIndex:100}}>
          <div style={{maxWidth:"720px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem"}}>
              <div>
                <h1 style={{fontFamily:"'Playfair Display',serif",color:"white",fontSize:"1.25rem"}}>My Voting Guide</h1>
                <p style={{color:"#9ca3af",fontSize:"0.72rem",marginTop:"0.15rem"}}>Personal Values · Race Analysis</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                {[{id:"quiz",label:"Questionnaire"},{id:"profile",label:"My Profile"},{id:"analyze",label:"Race Analysis"}].map(({id,label})=>(
                  <button key={id} onClick={()=>setView(id)} style={{padding:"0.35rem 0.8rem",borderRadius:"20px",border:view===id?"1.5px solid #c84b31":"1.5px solid #374151",background:view===id?"#c84b31":"transparent",color:view===id?"white":"#9ca3af",fontSize:"0.72rem",cursor:"pointer"}}>
                    {label}
                  </button>
                ))}
                {/* Test profile button - remove before public launch */}
                <button onClick={()=>{setAnswers(TEST_ANSWERS);setImportance(TEST_IMPORTANCE);setView("analyze");}} title="Load test profile" style={{padding:"0.35rem 0.6rem",borderRadius:"20px",border:"1.5px solid #374151",background:"transparent",color:"#6b7280",fontSize:"0.72rem",cursor:"pointer"}}>🧪</button>
                {!showResetConfirm
                  ?<button onClick={()=>setShowResetConfirm(true)} title="Start over" style={{padding:"0.35rem 0.6rem",borderRadius:"20px",border:"1.5px solid #374151",background:"transparent",color:"#6b7280",fontSize:"0.72rem",cursor:"pointer"}}>↺</button>
                  :<span style={{display:"flex",alignItems:"center",gap:"0.3rem"}}>
                    <span style={{fontSize:"0.68rem",color:"#f87171"}}>Reset?</span>
                    <button onClick={handleReset} style={{padding:"0.25rem 0.5rem",borderRadius:"6px",border:"none",background:"#c84b31",color:"white",fontSize:"0.68rem",cursor:"pointer"}}>Yes</button>
                    <button onClick={()=>setShowResetConfirm(false)} style={{padding:"0.25rem 0.5rem",borderRadius:"6px",border:"1.5px solid #374151",background:"transparent",color:"#9ca3af",fontSize:"0.68rem",cursor:"pointer"}}>No</button>
                  </span>
                }
              </div>
            </div>
            <div style={{marginTop:"0.75rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.25rem"}}>
                <span style={{fontSize:"0.65rem",color:"#6b7280"}}>{answeredQuestions}/{TOTAL_QUESTIONS} questions answered</span>
                <span style={{fontSize:"0.65rem",color:"#c84b31"}}>{progress}%</span>
              </div>
              <div style={{height:"3px",background:"#374151",borderRadius:"2px"}}>
                <div style={{height:"100%",width:`${progress}%`,background:"#c84b31",borderRadius:"2px",transition:"width 0.3s"}}/>
              </div>
            </div>
          </div>
        </div>

        <div style={{maxWidth:"720px",margin:"0 auto",padding:"1.5rem 1rem"}}>
          {answeredQuestions===0&&view==="quiz"&&(
            <div style={{background:"white",borderRadius:"16px",padding:"1.5rem",marginBottom:"1.5rem",borderLeft:"4px solid #c84b31",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",color:"#1a1a2e",fontSize:"1.15rem",marginBottom:"0.5rem"}}>Welcome to Your Personal Voting Guide</h2>
              <p style={{fontSize:"0.85rem",color:"#6b7280",lineHeight:1.6}}>Answer 22 questions across 6 topics to build your values profile. Then use <strong>Race Analysis</strong> to compare all candidates in a race, ranked by alignment with your values. Your answers save automatically.</p>
            </div>
          )}

          {/* QUIZ */}
          {view==="quiz"&&(
            <>
              <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
                {SECTIONS.map((s,i)=>{
                  const done=s.questions.filter(q=>answers[q.id]!==undefined).length;
                  return <button key={s.id} onClick={()=>setCurrentSection(i)} style={{padding:"0.4rem 0.8rem",borderRadius:"8px",border:i===currentSection?"2px solid #1a1a2e":"2px solid #e5e7eb",background:i===currentSection?"#1a1a2e":done===s.questions.length?"#f0fdf4":"white",color:i===currentSection?"white":done===s.questions.length?"#16a34a":"#374151",fontSize:"0.75rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.3rem"}}>
                    <span>{s.icon}</span><span>{s.label}</span>{done>0&&<span style={{opacity:0.6}}>({done}/{s.questions.length})</span>}
                  </button>;
                })}
              </div>
              <div style={{background:"white",borderRadius:"16px",padding:"1.5rem",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                <h2 style={{fontFamily:"'Playfair Display',serif",color:"#1a1a2e",fontSize:"1.2rem",marginBottom:"0.25rem"}}>{section.icon} {section.label}</h2>
                <p style={{color:"#9ca3af",fontSize:"0.78rem",marginBottom:"1.5rem"}}>{sectionAnswered}/{section.questions.length} answered</p>
                {section.questions.map((q,qi)=>(
                  <div key={q.id} style={{paddingBottom:"1.25rem",borderBottom:qi<section.questions.length-1?"1px solid #f3f4f6":"none",marginBottom:qi<section.questions.length-1?"1.25rem":0}}>
                    {q.type==="scale"?<ScaleQuestion question={q} value={answers[q.id]} onChange={v=>setAnswer(q.id,v)}/>:<ChoiceQuestion question={q} value={answers[q.id]} onChange={v=>setAnswer(q.id,v)}/>}
                    <ImportanceSelector value={importance[q.id]} onChange={v=>setImp(q.id,v)}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"1rem"}}>
                <button onClick={()=>setCurrentSection(Math.max(0,currentSection-1))} disabled={currentSection===0} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"2px solid #e5e7eb",background:"white",color:currentSection===0?"#d1d5db":"#374151",cursor:currentSection===0?"not-allowed":"pointer",fontSize:"0.85rem"}}>← Previous</button>
                {currentSection<SECTIONS.length-1
                  ?<button onClick={()=>setCurrentSection(currentSection+1)} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",background:"#1a1a2e",color:"white",cursor:"pointer",fontSize:"0.85rem",fontFamily:"'Playfair Display',serif"}}>Next Section →</button>
                  :<button onClick={()=>setView("analyze")} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",background:"#c84b31",color:"white",cursor:"pointer",fontSize:"0.85rem",fontFamily:"'Playfair Display',serif"}}>Analyze a Race →</button>
                }
              </div>
            </>
          )}

          {/* PROFILE */}
          {view==="profile"&&(
            <div>
              <ProfileSummary answers={answers} importance={importance}/>
              <div style={{marginTop:"1rem",display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                <button onClick={()=>setView("quiz")} style={{padding:"0.7rem 1.25rem",borderRadius:"8px",border:"2px solid #e5e7eb",background:"white",color:"#374151",cursor:"pointer",fontSize:"0.85rem"}}>← Edit Answers</button>
                <button onClick={()=>setView("analyze")} style={{padding:"0.7rem 1.5rem",borderRadius:"8px",border:"none",background:"#c84b31",color:"white",cursor:"pointer",fontSize:"0.9rem",fontFamily:"'Playfair Display',serif"}}>Analyze a Race →</button>
              </div>
            </div>
          )}

          {/* ANALYZE */}
          {view==="analyze"&&(
            answeredQuestions<5
              ?<div style={{textAlign:"center",padding:"3rem 1rem"}}>
                <p style={{fontSize:"1rem",color:"#6b7280",marginBottom:"1rem"}}>Answer at least 5 questions first to build your values profile.</p>
                <button onClick={()=>setView("quiz")} style={{padding:"0.6rem 1.25rem",borderRadius:"8px",border:"none",background:"#1a1a2e",color:"white",cursor:"pointer",fontFamily:"'Playfair Display',serif"}}>Go to Questionnaire →</button>
              </div>
              :<RaceAnalyzer answers={answers} importance={importance}/>
          )}

          <div style={{marginTop:"2rem",paddingTop:"1rem",borderTop:"1px solid #e5e7eb",textAlign:"center"}}>
            <p style={{fontSize:"0.72rem",color:"#9ca3af",lineHeight:1.6}}>Nonpartisan · Your answers are saved privately to your browser · Built with Claude</p>
          </div>
        </div>
      </div>
    </>
  );
}
