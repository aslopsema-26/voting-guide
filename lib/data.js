// lib/data.js

export const SECTIONS = [
  { id:"economy", label:"Economy & Work", icon:"⚖", questions:[
    { id:"tax_philosophy", text:"How should the tax burden be distributed?", type:"scale", left:"Lower taxes across the board, reduce government spending", right:"Higher taxes on wealthy/corporations to fund public services" },
    { id:"trade", text:"On trade and globalization:", type:"scale", left:"Prioritize domestic industry, tariffs to protect jobs", right:"Free trade and open markets benefit everyone long-term" },
    { id:"minimum_wage", text:"Minimum wage policy should be:", type:"choice", options:["Set by states/localities, not federal government","Modest federal floor, let markets mostly decide","Significantly higher federal minimum wage","Tied automatically to cost-of-living indexes"] },
    { id:"unions", text:"Labor unions are:", type:"scale", left:"Often burdensome to businesses and economic growth", right:"Essential for workers' rights and fair wages" },
  ]},
  { id:"healthcare", label:"Healthcare", icon:"✚", questions:[
    { id:"healthcare_system", text:"The ideal healthcare system is:", type:"choice", options:["Fully private, market-driven with minimal regulation","Private with subsidies for those who can't afford it","Mixed public option alongside private insurance","Universal single-payer coverage for all"] },
    { id:"drug_prices", text:"On prescription drug prices:", type:"scale", left:"Let the market determine pricing; innovation requires profit", right:"Government should negotiate and regulate drug prices" },
    { id:"mental_health", text:"Mental health care should be treated:", type:"scale", left:"As a personal responsibility with private solutions", right:"As a public health priority with robust government funding" },
  ]},
  { id:"environment", label:"Environment & Energy", icon:"◈", questions:[
    { id:"climate_urgency", text:"Climate change is:", type:"choice", options:["Not a significant concern for policy","A concern but economic costs of action are too high","Serious and requires steady, balanced policy response","A crisis requiring urgent, aggressive government action"] },
    { id:"energy_transition", text:"On transitioning energy sources:", type:"scale", left:"Let market forces drive energy choices; oppose mandates", right:"Government must actively subsidize and mandate clean energy" },
    { id:"land_use", text:"Federal lands and natural resources should be:", type:"scale", left:"Made available for economic development and energy production", right:"Preserved and protected for future generations" },
  ]},
  { id:"social", label:"Social Issues", icon:"◉", questions:[
    { id:"immigration", text:"On immigration policy:", type:"scale", left:"Strict enforcement, reduced legal and illegal immigration", right:"Welcoming approach, pathways to citizenship, expanded legal immigration" },
    { id:"criminal_justice", text:"Criminal justice reform should prioritize:", type:"choice", options:["Stronger enforcement and longer sentences as deterrent","Balancing public safety with proportionate sentencing","Reducing incarceration through rehabilitation programs","Systemic reform addressing root causes of crime"] },
    { id:"education", text:"K-12 education should primarily be:", type:"scale", left:"Parent/locally controlled with school choice and vouchers", right:"Equitably funded by federal government with consistent standards" },
    { id:"social_safety_net", text:"Government safety net programs:", type:"scale", left:"Should be limited; dependency reduces self-reliance", right:"Should be expanded; poverty requires systemic solutions" },
  ]},
  { id:"governance", label:"Government & Rights", icon:"◫", questions:[
    { id:"government_size", text:"In general, I believe government should:", type:"scale", left:"Be much smaller, with power devolved to states and individuals", right:"Play a larger role in ensuring equity and public welfare" },
    { id:"gun_policy", text:"On firearms policy:", type:"choice", options:["Second Amendment rights should not be infringed; oppose new restrictions","Minor reforms okay but broad access is important","Background checks, waiting periods, and red flag laws are reasonable","Significant new regulations and bans on certain weapons are needed"] },
    { id:"foreign_policy", text:"U.S. foreign policy should:", type:"scale", left:"Focus on America first; reduce foreign entanglements and aid", right:"Lead globally through alliances, aid, and international institutions" },
    { id:"executive_power", text:"On checks and balances:", type:"scale", left:"The executive needs more flexibility to act decisively", right:"Congressional and judicial oversight must be strongly preserved" },
  ]},
  { id:"priorities", label:"Your Priorities", icon:"★", questions:[
    { id:"top_issue", text:"The single issue I care most about is:", type:"choice", options:["Economy / jobs / cost of living","Healthcare","Climate / environment","Immigration","Education","Civil rights / social equity","Foreign policy / national security","Government integrity / democracy"] },
    { id:"candidate_character", text:"Character vs. policy when evaluating candidates:", type:"scale", left:"Policy positions matter most; I can overlook character issues", right:"Character and integrity are prerequisites; policy follows from that" },
    { id:"bipartisanship", text:"On compromise and bipartisanship:", type:"scale", left:"Principled politicians shouldn't compromise core beliefs", right:"Willingness to find common ground is essential for governance" },
    { id:"experience", text:"Political experience in candidates:", type:"scale", left:"Outsiders bring fresh perspective; insiders are the problem", right:"Governing experience and knowledge of systems is crucial" },
  ]},
];

export const IMPORTANCE_LABELS = ["Not important","Somewhat important","Very important","Essential"];
export const TOTAL_QUESTIONS = SECTIONS.reduce((s,sec)=>s+sec.questions.length,0);

export const PRESET_RACES = [
  { id:"ca_gov_2026", label:"2026 California Governor", candidates:[
    { name:"Xavier Becerra", party:"D", note:"Former U.S. HHS Secretary and CA Attorney General. Led 120+ lawsuits against Trump administration. Supports revising climate goals to keep fuel affordable, wants to freeze utility/insurance rates via emergency declaration." },
    { name:"Katie Porter", party:"D", note:"Former U.S. Representative known for whiteboard explanations of policy. Progressive on healthcare (supports public option), housing, and consumer protection. Strong on corporate accountability." },
    { name:"Antonio Villaraigosa", party:"D", note:"Former LA Mayor (2005–2013). Moderate Democrat. Promises to boost homebuyer assistance and create a task force on federal immigration enforcement compliance with state law." },
    { name:"Tom Steyer", party:"D", note:"Billionaire activist and former hedge fund manager. Wants billionaires to pay higher taxes. Climate-focused. Argues CA won't lose competitive edge even if wealthy leave the state." },
    { name:"Tony Thurmond", party:"D", note:"CA Superintendent of Public Instruction. Most progressive in the field. Supports one-time billionaire asset tax to backfill Medi-Cal cuts. Wants tax credits for lower-income working families and public housing funding." },
    { name:"Steve Hilton", party:"R", note:"Former Fox News host and tech entrepreneur. Conservative populist. Favors deregulation, lower taxes, and tougher enforcement on homelessness and crime." },
    { name:"Chad Bianco", party:"R", note:"Riverside County Sheriff. Law-and-order conservative. Anti-sanctuary policies, strong 2nd Amendment supporter, skeptical of state climate mandates." },
  ]},
];

export const TEST_ANSWERS = {
  tax_philosophy:5, trade:5, minimum_wage:2, unions:5,
  healthcare_system:2, drug_prices:6, mental_health:5,
  climate_urgency:2, energy_transition:5, land_use:5,
  immigration:5, criminal_justice:2, education:5, social_safety_net:5,
  government_size:5, gun_policy:2, foreign_policy:5, executive_power:6,
  top_issue:7, candidate_character:5, bipartisanship:5, experience:5,
};

export const TEST_IMPORTANCE = {
  tax_philosophy:2, healthcare_system:3, climate_urgency:3,
  immigration:1, top_issue:3, candidate_character:2,
};

export function buildProfileText(answers, importance) {
  const lines = [];
  for (const section of SECTIONS) {
    for (const q of section.questions) {
      const val = answers[q.id];
      if (val === undefined) continue;
      const imp = importance[q.id] !== undefined ? IMPORTANCE_LABELS[importance[q.id]] : "unspecified";
      if (q.type==="scale") lines.push(`${q.text} → ${val}/7 (1="${q.left}", 7="${q.right}"). Importance: ${imp}`);
      else lines.push(`${q.text} → "${q.options[val]}". Importance: ${imp}`);
    }
  }
  return lines.join("\n");
}
