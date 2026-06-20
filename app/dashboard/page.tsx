'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

type MarketTrend = {
  region: string;
  direction: 'rising' | 'falling' | 'stable';
  percentChange: number;
  recommendation: 'lock_now' | 'wait' | 'monitor';
};

type BestRateResponse = {
  success?: boolean;
  rate?: number;
  supplier?: string;
  savings?: number;
  error?: string;
} | null;
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CalculationWithBusiness } from '@/lib/types';
import TeamSwitcher from '@/app/components/TeamSwitcher';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

type EnrichedLead = CalculationWithBusiness & {
daysRemaining:number
heat:string
brokerRevenue:number
priorityScore:number
radarSignal:string
closeProbability:number
}

export default function Dashboard() {

const router = useRouter()

const [leads,setLeads] = useState<CalculationWithBusiness[]>([])
const [loading,setLoading] = useState(true)
const [currentTeam,setCurrentTeam] = useState<string | null>(null)
const [sendingId,setSendingId] = useState<string | null>(null)
const [authenticated,setAuthenticated] = useState(false)
const [error,setError] = useState<string | null>(null)
const [sortField,setSortField] = useState<string>('created_at')
const [sortDirection,setSortDirection] = useState<'asc'|'desc'>('desc')
const [matchingSuppliers, setMatchingSuppliers] = useState<{[key: string]: any}>({});
const [launchingBid, setLaunchingBid] = useState<string | null>(null);
const [showBidModal, setShowBidModal] = useState(false);
const [selectedLead, setSelectedLead] = useState<CalculationWithBusiness | null>(null);
const [notifications, setNotifications] = useState<any[]>([]);
const [showNotifications, setShowNotifications] = useState(false);
const [marketTrend, setMarketTrend] = useState<MarketTrend | null>(null);
const [bestRate, setBestRate] = useState<BestRateResponse>(null);
const [rateInsightsLoading, setRateInsightsLoading] = useState<boolean>(false);
const [rateInsightsError, setRateInsightsError] = useState<string | null>(null);
const [crossSell, setCrossSell] = useState<any>(null);

/* AUTH CHECK */

useEffect(()=>{

async function checkAuth(){

const { data:{ user } } = await supabase.auth.getUser()

if(!user){
router.push('/login')
}else{
setAuthenticated(true)
}

}

checkAuth()

},[router])

/* LOAD LEADS */

const loadLeads = useCallback(async (teamId: string | null) => {
  if (!teamId) {
    console.error("LOAD LEADS ERROR: missing teamId");
    setError("No team selected");
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const response = await supabase
      .from("calculations")
      .select(`
        *,
        business_types(
          id,
          name,
          electricity_kwh_per_sqft,
          gas_therms_per_sqft
        )
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (response.error) {
      console.error("LOAD LEADS SUPABASE ERROR", {
        message: response.error.message,
        details: response.error.details,
        hint: response.error.hint,
        code: response.error.code,
      });

      setError(response.error.message || "Failed to load leads");
      return;
    }

    setLeads((response.data ?? []) as CalculationWithBusiness[]);
  } catch (err) {
    console.error("LOAD LEADS JS ERROR", err);
    setError(err instanceof Error ? err.message : "Failed to load leads");
  } finally {
    setLoading(false);
  }
}, []);

// Add this TEMPORARY debug block after your useState declarations
useEffect(() => {
    async function debugDatabase() {
        console.log('🔍 DEBUG: Starting database check...');
        
        // 1. Check if you're logged in
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 User:', user?.email);
        
        if (!user) {
            console.log('❌ No user logged in');
            return;
        }
        
        // 2. Check localStorage
        const teamId = localStorage.getItem('currentTeam');
        console.log('🏷️ Team in localStorage:', teamId);
        
        // 3. Try to fetch leads directly
        const { data: leads, error: leadsError } = await supabase
            .from('calculations')
            .select('count')
            .eq('team_id', teamId);
        console.log('📊 Direct lead query:', { leads, error: leadsError });
        
        // 4. Check if team exists
        const { data: team } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId);
        console.log('🏢 Team exists:', team);
        
        // 5. Check if you're a team member
        const { data: member } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', teamId)
            .eq('user_id', user.id);
        console.log('👥 Team member:', member);
    }
    
    debugDatabase();
}, []);

// 🔍 Testing supplier matching (temporary)
useEffect(() => {
    const testMatching = async () => {
        if (leads.length > 0) {
            console.log('🔍 Testing all leads for supplier matches...');
            
            const { supplierMatching } = await import('@/lib/supplierMatching');
            
            for (let i = 0; i < Math.min(leads.length, 3); i++) {
                const lead = leads[i];
                
                const annualMwh = lead.total_electricity_kwh 
                    ? Math.round(lead.total_electricity_kwh / 1000) 
                    : 0;
                
                console.log(`\n📊 Testing Lead ${i+1}: ${lead.business_name}`);
                console.log(`   Type ID: ${lead.business_type_id}, MWh: ${annualMwh}`);
                
                // DEBUG: Call the function and log raw result
                const result = await supplierMatching.matchSuppliersToDeal(lead);
                
                console.log(`   🔍 Raw result:`, result);
                
                if (result.suppliers.length > 0) {
                    console.log(`   ✅ Found ${result.suppliers.length} suppliers!`);
                } else {
                    console.log(`   ❌ No suppliers found`);
                    
                    // DEBUG: Check what parameters were used
                    console.log(`   🔧 Debug - Check your supplierMatching.ts extractStateFromLead function`);
                }
            }
        }
    };
    testMatching();
}, [leads]);

useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
}, []);

useEffect(() => {
    if (selectedLead) {
        fetch(`/api/cross-sell/${selectedLead.id}`)
            .then(r => r.json())
            .then(data => setCrossSell(data.recommendations));
    }
}, [selectedLead]);

useEffect(() => {
  if (leads.length === 0) {
    setMarketTrend(null);
    setBestRate(null);
    setRateInsightsError(null);
    return;
  }
  const controller = new AbortController();
    const firstLead = leads[0] as (CalculationWithBusiness & {
    state?: string | null;
    utility_state?: string | null;
    region?: string | null;
  }) | undefined;

  const regionSource =
    firstLead?.utility_state ??
    firstLead?.state ??
    firstLead?.region ??
    null;

  const region =
    typeof regionSource === 'string' && regionSource.trim().length > 0
      ? regionSource.trim().toUpperCase()
      : 'TX';
  async function loadRateInsights(): Promise<void> {
    setRateInsightsLoading(true);
    setRateInsightsError(null);
    try {
      const [trendResponse, bestRateResponse] = await Promise.all([
        fetch(`/api/rates/trends?region=${encodeURIComponent(region)}`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        }),
        firstLead?.id
          ? fetch(`/api/leads/${encodeURIComponent(firstLead.id)}/best-rate`, {
              method: 'GET',
              signal: controller.signal,
              cache: 'no-store',
            })
          : Promise.resolve(null),
      ]);
      if (!trendResponse.ok) {
        throw new Error(`Failed to load market trends (${trendResponse.status})`);
      }
      const trendJson = (await trendResponse.json()) as {
        success?: boolean;
        trends?: MarketTrend;
        error?: string;
      };
      if (!trendJson.success || !trendJson.trends) {
        throw new Error(trendJson.error ?? 'Market trends response was invalid');
      }
      setMarketTrend(trendJson.trends);
            if (bestRateResponse) {
        if (bestRateResponse.ok) {
          const bestRateJson = (await bestRateResponse.json()) as BestRateResponse;
          setBestRate(bestRateJson);
        } else if (bestRateResponse.status === 404) {
          setBestRate(null);
        } else {
          throw new Error(`Failed to load best rate (${bestRateResponse.status})`);
        }
      } else {
        setBestRate(null);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setRateInsightsError(
        error instanceof Error ? error.message : 'Failed to load rate insights'
      );
      setMarketTrend(null);
      setBestRate(null);
    } finally {
      if (!controller.signal.aborted) {
        setRateInsightsLoading(false);
      }
    }
  }
  void loadRateInsights();
  return () => {
    controller.abort();
  };
}, [leads]);

/* TEAM CHANGE LISTENER */

useEffect(()=>{

const handleTeamChange = (e:any)=>{

const team = e.detail

setCurrentTeam(team.id)

loadLeads(team.id)

}

window.addEventListener('teamChanged',handleTeamChange)

return ()=>{

window.removeEventListener('teamChanged',handleTeamChange)

}

},[loadLeads])

/* INITIAL TEAM LOAD */

useEffect(()=>{

const teamId = localStorage.getItem('currentTeam')

if(teamId){

setCurrentTeam(teamId)

loadLeads(teamId)

}else{

setLoading(false)

}

},[loadLeads])

/* DERIVED STATS */

const stats = useMemo(()=>{

const now = new Date()

let expiringSoon:CalculationWithBusiness[] = []
let pipelineCommission = 0

for(const lead of leads){

pipelineCommission += (lead.total_potential_savings || 0) * 0.10

if(lead.contract_expiration_date){

const expiration = new Date(lead.contract_expiration_date)

const days = (expiration.getTime()-now.getTime())/(1000*3600*24)

if(days > 0 && days < 180){
expiringSoon.push(lead)
}

}

}

return{
expiringSoon,
pipelineCommission
}

},[leads])

/* PIPELINE COUNTS */

const pipeline = useMemo(()=>{

const counts = {
lead:0,
contacted:0,
proposal:0,
negotiation:0,
closed:0
}

for(const lead of leads){

if(lead.status && counts.hasOwnProperty(lead.status)){
counts[lead.status as keyof typeof counts]++
}

}

return counts

},[leads])

/* ADVANCE DEAL STATUS */

const advanceDealStatus = async(lead:CalculationWithBusiness)=>{

const order = [
"lead",
"contacted",
"proposal",
"negotiation",
"closed"
]

const currentIndex = order.indexOf(lead.status)

if(currentIndex === -1) return

const nextStatus = order[currentIndex+1]

if(!nextStatus) return

await supabase
.from('calculations')
.update({status:nextStatus})
.eq('id',lead.id)

if(currentTeam) loadLeads(currentTeam)

}

/* SEND PROPOSAL */

const sendProposal = async(lead:CalculationWithBusiness)=>{

setSendingId(lead.id)

try{

const res = await fetch('/api/send-proposal',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(lead)
})

if(res.ok){

await supabase
.from('calculations')
.update({status:'proposal'})
.eq('id',lead.id)

if(currentTeam) loadLeads(currentTeam)

alert('Proposal sent successfully')

}else{

alert('Failed to send proposal')

}

}catch(err){

console.error(err)

}finally{

setSendingId(null)

}

}

const launchBid = async (lead: CalculationWithBusiness) => {
    setLaunchingBid(lead.id);
    
    try {
        setMatchingSuppliers(prev => ({ ...prev, [lead.id]: { loading: true } }));
        
        const { supplierMatching } = await import('@/lib/supplierMatching');
        const matchResult = await supplierMatching.matchSuppliersToDeal(lead);
        
        if (matchResult.suppliers.length === 0) {
            alert('No qualified suppliers found for this deal');
            setLaunchingBid(null);
            return;
        }
        
        setMatchingSuppliers(prev => ({
            ...prev,
            [lead.id]: {
                loading: false,
                suppliers: matchResult.suppliers,
                marketAvgRate: matchResult.marketAverageRate,
                competitiveness: matchResult.competitivenessScore,
                showModal: true,
                selected: []
            }
        }));
        
        setSelectedLead(lead);
        setShowBidModal(true);
        
    } catch (err) {
        console.error('Error launching bid:', err);
        alert('Failed to launch bid');
    } finally {
        setLaunchingBid(null);
    }
};

const confirmBidLaunch = async () => {
    if (!selectedLead) return;
    
    const leadData = matchingSuppliers[selectedLead.id];
    if (!leadData || !leadData.selected || leadData.selected.length === 0) {
        alert('Select at least one supplier');
        return;
    }
    
    try {
        const { data: bidRequest, error } = await supabase
            .from('bid_requests')
            .insert([{
                team_id: currentTeam,
                calculation_id: selectedLead.id,
                status: 'open',
                estimated_annual_mwh: Math.round((selectedLead.total_electricity_kwh || 0) / 1000),
                bid_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                supplier_count: leadData.selected.length
            }])
            .select()
            .single();

        if (error) throw error;

        if (bidRequest) {
            const bids = leadData.selected.map((supplierId: string) => ({
                bid_request_id: bidRequest.id,
                supplier_id: supplierId,
                status: 'pending'
            }));
            
            await supabase.from('bids').insert(bids);
            
            // Notify suppliers
            await fetch('/api/notify-suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bidRequestId: bidRequest.id,
                    supplierIds: leadData.selected
                })
            });
            
            alert(`✅ Bid launched to ${leadData.selected.length} suppliers!`);
            setShowBidModal(false);
            setMatchingSuppliers(prev => {
                const newState = { ...prev };
                delete newState[selectedLead.id];
                return newState;
            });
            setSelectedLead(null);
        }
    } catch (err) {
        console.error('Error confirming bid:', err);
        alert('Failed to create bid request');
    }
};

const loadNotifications = async () => {
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        setNotifications(data.notifications || []);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
};

const markAsRead = async (id: string) => {
    try {
        await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        // Remove from local state
        setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

/* HELPERS */

const formatCurrency=(n:number)=>{

return new Intl.NumberFormat('en-US',{
style:'currency',
currency:'USD',
maximumFractionDigits:0
}).format(n)

}

/* AI KILL SHOT ENGINE */

function generateKillShot(
lead: CalculationWithBusiness & {
priorityScore:number
closeProbability:number
daysRemaining:number
}
){

if(!lead) return ""

if(lead.closeProbability > 85){
return `Call ${lead.business_name} immediately. Their contract expires in ${lead.daysRemaining} days and you can show them ${Math.round((lead.total_potential_savings || 0)/12).toLocaleString()} in monthly savings.`
}

if(lead.closeProbability > 65){
return `Send proposal today and follow up tomorrow. Emphasize ${Math.round((lead.total_potential_savings || 0)/12).toLocaleString()} monthly savings potential.`
}

return `Warm opportunity. Educate the customer about energy savings and build the relationship.`
}

/* REVENUE INTELLIGENCE ENGINE */

function calculateDealMetrics(lead:CalculationWithBusiness){

const savings = lead.total_potential_savings || 0

const expiration = lead.contract_expiration_date
? new Date(lead.contract_expiration_date)
: null

const today = new Date()

let daysRemaining = 999

if(expiration){
daysRemaining = Math.max(
0,
Math.floor(
(expiration.getTime()-today.getTime())/(1000*60*60*24)
)
)
}

/* HEAT DETECTION */

let heat = "COLD"

if(daysRemaining < 60 && savings > 100000){
heat = "HOT"
}
else if(daysRemaining < 120){
heat = "WARM"
}

/* BROKER REVENUE ESTIMATE */

const brokerMargin = 0.10
const brokerRevenue = savings * brokerMargin

/* PRIORITY SCORE */

const expirationScore = Math.max(0,180-daysRemaining)

const savingsScore = savings/10000

const priorityScore = Math.round(
expirationScore + savingsScore
)

/* CLOSE PROBABILITY ENGINE */

let stageWeight = 0

if(lead.status==="lead") stageWeight = 10
if(lead.status==="contacted") stageWeight = 30
if(lead.status==="proposal") stageWeight = 60
if(lead.status==="negotiation") stageWeight = 85
if(lead.status==="closed") stageWeight = 100

const urgencyBoost =
daysRemaining < 60 ? 15 :
daysRemaining < 120 ? 8 : 0

const valueBoost =
savings > 100000 ? 10 :
savings > 50000 ? 5 : 0

const closeProbability = Math.min(
100,
stageWeight + urgencyBoost + valueBoost
)

/* DEAL RADAR */

let radarSignal = "COLD"

if(priorityScore > 160){
radarSignal = "EXPLOSIVE"
}
else if(priorityScore > 110){
radarSignal = "HOT"
}
else if(priorityScore > 60){
radarSignal = "WARM"
}

/* RETURN METRICS */

return{
daysRemaining,
heat,
brokerRevenue,
priorityScore,
radarSignal,
closeProbability
}

}

const formatDate=(d:string)=>{

return new Date(d).toLocaleDateString('en-US',{
month:'short',
day:'numeric',
year:'numeric'
})

}

const enrichedLeads = useMemo<EnrichedLead[]>(()=>{

return leads.map(lead=>{

const metrics = calculateDealMetrics(lead)

return{
...lead,
...metrics
}

})

},[leads])

const sortedLeads = useMemo<EnrichedLead[]>(()=>{

const sorted = [...enrichedLeads]

sorted.sort((a,b)=>{

let valA:any
let valB:any

switch(sortField){

case 'business':
valA = a.business_name
valB = b.business_name
break

case 'date':
valA = new Date(a.created_at)
valB = new Date(b.created_at)
break

case 'revenue':
valA = a.brokerRevenue
valB = b.brokerRevenue
break

case 'score':
valA = a.priorityScore
valB = b.priorityScore
break

default:
valA = a.created_at
valB = b.created_at

}

if(valA < valB) return sortDirection === 'asc' ? -1 : 1
if(valA > valB) return sortDirection === 'asc' ? 1 : -1
return 0

})

return sorted

},[enrichedLeads,sortField,sortDirection])

/* TOP DEALS TO CALL TODAY */

const topDeals = useMemo<EnrichedLead[]>(()=>{

return [...enrichedLeads]
.sort((a,b)=>b.priorityScore - a.priorityScore)
.slice(0,5)

},[enrichedLeads])

/* DEALS ABOUT TO EXPLODE */

const explodingDeals = useMemo(()=>{

return enrichedLeads
.filter(lead=>lead.radarSignal==="EXPLOSIVE")
.sort((a,b)=>b.brokerRevenue - a.brokerRevenue)
.slice(0,3)

},[enrichedLeads])

/* COMMISSION FORECAST ENGINE */

const commissionForecast = useMemo(()=>{

let expectedRevenue = 0
let likelyDeals = 0

for(const lead of enrichedLeads){

if(lead.closeProbability > 70){

expectedRevenue += lead.brokerRevenue
likelyDeals++

}

}

return{
expectedRevenue,
likelyDeals
}

},[enrichedLeads])

/* DEAL VELOCITY ENGINE */

const fastClosingDeals = useMemo(()=>{

return enrichedLeads
.filter(lead=>lead.closeProbability > 80 && lead.daysRemaining < 90)
.sort((a,b)=>b.closeProbability - a.closeProbability)
.slice(0,3)

},[enrichedLeads])

/* BLOCK RENDER UNTIL AUTH */

if(!authenticated) return null

/* LOADING STATE */

if(loading){

return(
<div className="p-6">
<div className="animate-pulse">
<div className="h-8 bg-gray-200 w-1/4 mb-6"/>
<div className="grid md:grid-cols-3 gap-4">
<div className="h-24 bg-gray-200"/>
<div className="h-24 bg-gray-200"/>
<div className="h-24 bg-gray-200"/>
</div>
</div>
</div>
)

}

return(

<div className="p-6 max-w-7xl mx-auto">

{/* HEADER */}
<div className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold">Dark Pool Dashboard</h1>
    <div className="flex items-center space-x-3">
        <button
            onClick={() => loadLeads(currentTeam!)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center"
            disabled={loading}
        >
            <span className="mr-1">↻</span>
            Refresh
        </button>
        
        {/* Notification Bell */}
        <div className="relative">
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900"
            >
                🔔
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {notifications.length}
                    </span>
                )}
            </button>
            
            {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b font-bold">Enterprise Alerts</div>
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No new alerts</div>
                    ) : (
                        notifications.map((n: any) => (
                            <div key={n.id} className="p-3 border-b hover:bg-gray-50">
                                <p className="font-medium">{n.title}</p>
                                <p className="text-sm text-gray-600">{n.message}</p>
                                <div className="flex justify-between mt-2">
                                    <a
                                        href={n.brief_url}
                                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                                    >
                                        View Brief
                                    </a>
                                    <button
                                        onClick={() => markAsRead(n.id)}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
        
        <Link
            href="/leads"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center"
        >
            <span className="mr-2">📊</span>
            Lead Dashboard
        </Link>
        <Link
            href="/command-center"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center"
        >
            <span className="mr-2">🎮</span>
            Command Center
        </Link>
        <TeamSwitcher />
        <LogoutButton />
    </div>
</div>

{/* TOP METRICS */}

<div className="grid md:grid-cols-4 gap-4 mb-8">

<div className="bg-blue-50 p-4 rounded-lg shadow">
<p className="text-sm text-blue-700 uppercase">Total Leads</p>
<p className="text-3xl font-bold text-blue-900">{leads.length}</p>
</div>

<div className="bg-yellow-50 p-4 rounded-lg shadow">
<p className="text-sm text-yellow-700 uppercase">Expiring Soon</p>
<p className="text-3xl font-bold text-yellow-900">
{stats.expiringSoon.length}
</p>
</div>

<div className="bg-green-50 p-4 rounded-lg shadow">
<p className="text-sm text-green-700 uppercase">Pipeline Commission</p>
<p className="text-3xl font-bold text-green-900">
{formatCurrency(stats.pipelineCommission)}
</p>
</div>

<div className="bg-purple-50 p-4 rounded-lg shadow">
<p className="text-sm text-purple-700 uppercase">
Projected Commission
</p>
<p className="text-3xl font-bold text-purple-900">
{formatCurrency(commissionForecast.expectedRevenue)}
</p>
</div>

</div>

{/* MARKET RATE INTELLIGENCE */}
{(rateInsightsLoading || marketTrend || rateInsightsError) && (
  <div className="bg-white rounded-lg shadow p-4 mb-8">
    <h2 className="text-lg font-bold mb-3">📈 Market Rate Intelligence</h2>
    {rateInsightsLoading && (
      <p className="text-sm text-gray-500">Loading rate insights...</p>
    )}
    {rateInsightsError && (
      <p className="text-sm text-red-600">{rateInsightsError}</p>
    )}
    {marketTrend && !rateInsightsLoading && (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs uppercase text-gray-500 mb-1">Market Trend — {marketTrend.region}</p>
          <p className="text-lg font-bold capitalize">{marketTrend.direction}</p>
          <p className="text-sm text-gray-600">{marketTrend.percentChange.toFixed(1)}% change</p>
          <p className="text-sm font-semibold mt-1 text-indigo-600">
            Recommendation: {marketTrend.recommendation.replace('_', ' ')}
          </p>
        </div>
        {bestRate && bestRate.success && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs uppercase text-gray-500 mb-1">Best Available Rate</p>
            <p className="text-lg font-bold text-green-700">{bestRate.rate}¢/kWh</p>
            <p className="text-sm text-gray-600">via {bestRate.supplier}</p>
            <p className="text-sm font-semibold text-green-600">
              Est. Savings: {formatCurrency(bestRate.savings ?? 0)}
            </p>
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* AI BROKER ASSISTANT */}

{/* AI BROKER ASSISTANT */}

<div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow p-4 mb-8">

<h2 className="text-lg font-bold text-indigo-800 mb-3">
🤖 AI Broker Assistant
</h2>

{topDeals.length>0 &&(

<div className="text-sm text-indigo-900 space-y-1">

<p>
Call <strong>{topDeals.length}</strong> high value businesses today.
</p>

<p>
Potential Commission:
<strong>
{" "}
{formatCurrency(
topDeals.reduce((sum,lead)=>sum+lead.brokerRevenue,0)
)}
</strong>
</p>

<p>
Highest Priority:
<strong>
{" "}
{topDeals[0].business_name}
</strong>
</p>

<p className="mt-2 text-sm text-indigo-900">
<strong>Kill Shot:</strong>
{" "}
{generateKillShot(topDeals[0])}
</p>

<p className="text-sm mt-2 text-indigo-800">
<strong>Next Move:</strong>
Follow up within 24 hours while the opportunity is hot.
</p>

<p className="mt-3 font-semibold">
Today's Call List
</p>

<ul className="list-disc ml-5 text-sm">

{topDeals.slice(0,3).map(lead=>(
<li key={lead.id}>
Call {lead.business_name}
</li>
))}

</ul>

</div>

)}

</div>

{/* PIPELINE BOARD */}

<div className="bg-white rounded-lg shadow p-4 mb-8">

<h2 className="text-lg font-bold mb-4">
Deal Pipeline
</h2>

<div className="grid grid-cols-5 gap-4 text-center">

<div className="bg-gray-50 p-3 rounded">
<p className="text-xs uppercase text-gray-500">Leads</p>
<p className="text-2xl font-bold">{pipeline.lead}</p>
</div>

<div className="bg-blue-50 p-3 rounded">
<p className="text-xs uppercase text-blue-700">Contacted</p>
<p className="text-2xl font-bold text-blue-800">{pipeline.contacted}</p>
</div>

<div className="bg-yellow-50 p-3 rounded">
<p className="text-xs uppercase text-yellow-700">Proposals</p>
<p className="text-2xl font-bold text-yellow-800">{pipeline.proposal}</p>
</div>

<div className="bg-purple-50 p-3 rounded">
<p className="text-xs uppercase text-purple-700">Negotiation</p>
<p className="text-2xl font-bold text-purple-800">{pipeline.negotiation}</p>
</div>

<div className="bg-green-50 p-3 rounded">
<p className="text-xs uppercase text-green-700">Closed</p>
<p className="text-2xl font-bold text-green-800">{pipeline.closed}</p>
</div>

</div>

</div>

{/* TOP DEALS TO CALL TODAY */}

<div className="bg-white rounded-lg shadow p-4 mb-8">

<h2 className="text-lg font-bold mb-4">
Top Deals To Call Today
</h2>

{topDeals.length===0 ?(

<p className="text-gray-500 text-center py-6">
No opportunities yet
</p>

):( 

<div className="space-y-3">

{topDeals.map(lead=>(

<div
key={lead.id}
className="flex justify-between items-center border-b pb-2"
>

<div>

<p className="font-semibold text-sm">
{lead.business_name}
</p>

<p className="text-xs text-gray-500">
Score: {lead.priorityScore}
</p>

</div>

<div className="text-right">

<p className="font-bold text-green-600">
{formatCurrency(lead.brokerRevenue)}
</p>

<button
onClick={()=>sendProposal(lead)}
className="text-xs text-blue-600 hover:underline"
>
Send Proposal
</button>

</div>

</div>

))}

</div>

)}

</div>

{/* DEALS ABOUT TO EXPLODE */}

<div className="bg-red-50 border border-red-200 rounded-lg shadow p-4 mb-8">

<h2 className="text-lg font-bold text-red-700 mb-4">
🚨 Deals About To Explode
</h2>

{explodingDeals.length===0 ?(

<p className="text-gray-500 text-center py-4">
No critical deals right now
</p>

):( 

<div className="space-y-3">

{explodingDeals.map(lead=>(

<div
key={lead.id}
className="flex justify-between items-center border-b pb-2"
>

<div>

<p className="font-semibold text-sm">
{lead.business_name}
</p>

<p className="text-xs text-gray-600">
Expires in {lead.daysRemaining} days
</p>

</div>

<div className="text-right">

<p className="font-bold text-green-700">
{formatCurrency(lead.brokerRevenue)}
</p>

<button
onClick={()=>sendProposal(lead)}
className="text-xs text-red-600 hover:underline"
>
Send Proposal
</button>

</div>

</div>

))}

</div>

)}

</div>

{/* NEW DEALS CLOSING SOON PANEL */}
<div className="bg-green-50 border border-green-200 rounded-lg shadow p-4 mb-8">

<h2 className="text-lg font-bold text-green-700 mb-4">
⚡ Deals Closing Soon
</h2>

{fastClosingDeals.length===0 ?(

<p className="text-gray-500 text-center py-4">
No fast closing deals
</p>

):( 

<div className="space-y-3">

{fastClosingDeals.map(lead=>(

<div
key={lead.id}
className="flex justify-between items-center border-b pb-2"
>

<div>

<p className="font-semibold text-sm">
{lead.business_name}
</p>

<p className="text-xs text-gray-600">
Close Probability: {lead.closeProbability}%
</p>

</div>

<div className="text-right font-bold text-green-700">
{formatCurrency(lead.brokerRevenue)}
</div>

</div>

))}

</div>

)}

</div>

{/* MAIN TABLES */}

<div className="grid md:grid-cols-2 gap-6">

{/* EXPIRING CONTRACTS */}

<div className="bg-white rounded-lg shadow p-4">

<h2 className="text-xl font-bold mb-4">
Expiring Contracts
</h2>

{stats.expiringSoon.length===0 ?(

<p className="text-gray-500 text-center py-8">
No expiring contracts
</p>

):(

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead>
<tr className="border-b text-gray-600">
<th className="text-left py-3 w-[30%]">Business</th>
<th className="text-left py-3 w-[20%]">Type</th>
<th className="text-left py-3 w-[25%]">Expiration</th>
<th className="text-right py-3 w-[25%]">Savings</th>
</tr>
</thead>

<tbody>

{stats.expiringSoon.map(lead=>(

<tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">

<td className="py-3 pr-4 font-medium whitespace-nowrap">
{lead.business_name}
</td>

<td className="py-3 pr-4">
{lead.business_types?.name}
</td>

<td className="py-3 pr-4">

<span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">

{formatDate(lead.contract_expiration_date!)}

</span>

</td>

<td className="py-3 text-right font-bold text-green-600">

{formatCurrency(lead.total_potential_savings)}

</td>

</tr>

))}

</tbody>

</table>

</div>

)}

</div>

{/* RECENT LEADS */}

<div className="bg-white rounded-lg shadow p-4">

<h2 className="text-xl font-bold mb-4">
Recent Leads
</h2>

{leads.length===0 ?(

<p className="text-gray-500 text-center py-8">
No leads yet
</p>

):(

<div className="overflow-x-auto">

<table className="min-w-[1200px] w-full table-fixed text-sm">

<thead>

<tr className="border-b text-gray-600 text-xs uppercase tracking-wide">
  <th className="text-left py-3 pr-4 w-[18%]">Business</th>

  <th className="text-left py-3 pr-4 w-[18%]">Email</th>

  <th
    onClick={()=>{
      setSortField('date')
      setSortDirection(sortDirection==='asc'?'desc':'asc')
    }}
    className="text-left py-3 pr-4 w-[11%] cursor-pointer whitespace-nowrap"
  >
    Date {sortField==='date' && (sortDirection==='asc' ? '↑' : '↓')}
  </th>

  <th className="text-left py-3 pr-4 w-[11%] whitespace-nowrap">Status</th>

  <th className="text-left py-3 pr-4 w-[10%] whitespace-nowrap">
    Health
  </th>

  <th
    onClick={()=>{
      setSortField('revenue')
      setSortDirection(sortDirection==='asc'?'desc':'asc')
    }}
    className="text-right py-3 pr-4 w-[10%] cursor-pointer whitespace-nowrap"
  >
    Broker Rev {sortField==='revenue' && (sortDirection==='asc' ? '↑' : '↓')}
  </th>

  <th
    onClick={()=>{
      setSortField('score')
      setSortDirection(sortDirection==='asc'?'desc':'asc')
    }}
    className="text-right py-3 pr-4 w-[7%] cursor-pointer whitespace-nowrap"
  >
    Score {sortField==='score' && (sortDirection==='asc' ? '↑' : '↓')}
  </th>

  <th className="text-right py-3 pr-4 w-[7%] whitespace-nowrap">
    Close %
  </th>

  <th className="text-right py-3 w-[8%] whitespace-nowrap">Action</th>
</tr>

</thead>

<tbody>

{sortedLeads.slice(0,10).map(lead=>{

return(

<tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">

<td className="py-3 pr-4 font-medium whitespace-nowrap">
<div className="flex items-center gap-2">

<span className="font-medium">
{lead.business_name}
</span>

{lead.radarSignal==="EXPLOSIVE" && (
<span title="Explosive Deal" className="text-red-700 animate-pulse text-sm">
🚨
</span>
)}

{lead.radarSignal==="HOT" && (
<span title="High Opportunity" className="text-red-600 text-sm">
🔥
</span>
)}

{lead.radarSignal==="WARM" && (
<span title="Medium Opportunity" className="text-yellow-500 text-sm">
⚠
</span>
)}

{lead.radarSignal==="COLD" && (
<span title="Low Priority" className="text-gray-400 text-sm">
❄
</span>
)}

</div>
</td>

<td className="py-3 pr-4">

<a
href={`mailto:${lead.user_email}`}
className="text-blue-600 hover:underline max-w-[180px] truncate block"
>
{lead.user_email}
</a>

</td>

<td className="py-3 pr-4">
{formatDate(lead.created_at)}
</td>

<td className="py-3 pr-4">

<span
onClick={()=>advanceDealStatus(lead)}
className={`
cursor-pointer
inline-flex
items-center
px-2
py-0.5
text-[10px]
font-semibold
rounded-md
uppercase
tracking-wide
${
lead.status==='lead'
?'bg-gray-100 text-gray-700'
:lead.status==='contacted'
?'bg-blue-100 text-blue-700'
:lead.status==='proposal'
?'bg-yellow-100 text-yellow-700'
:'bg-green-100 text-green-700'
}
`}>
{lead.status}
</span>

</td>

<td className="py-3 pr-4">

<span className={`
px-2 py-0.5 rounded text-xs font-semibold
${
lead.radarSignal==="EXPLOSIVE"
? "bg-red-100 text-red-700"
: lead.radarSignal==="HOT"
? "bg-orange-100 text-orange-700"
: lead.radarSignal==="WARM"
? "bg-yellow-100 text-yellow-700"
: "bg-gray-100 text-gray-500"
}
`}>

{lead.radarSignal}

</span>

</td>

<td className="py-3 text-center font-semibold text-green-600 whitespace-nowrap">
{formatCurrency(lead.brokerRevenue)}
</td>

<td className="py-3 pr-3 text-right font-bold whitespace-nowrap">
{lead.priorityScore}
</td>

<td className="py-3 text-right font-semibold text-indigo-600">
<span className={`
font-semibold
${
lead.closeProbability>80
?'text-green-700'
:lead.closeProbability>60
?'text-yellow-700'
:'text-gray-500'
}
`}>
{lead.closeProbability}%
</span>
</td>

<td className="py-3 text-right whitespace-nowrap">
    {lead.status!=='proposal' && lead.status!=='closed' &&(
        <div className="flex justify-end gap-1">
            <button
                onClick={()=>sendProposal(lead)}
                disabled={sendingId===lead.id}
                className="bg-blue-600 text-white px-2.5 py-1 text-xs rounded-md hover:bg-blue-700 transition"
            >
                {sendingId===lead.id ? '...' : 'Send'}
            </button>
            
            <button
                onClick={() => launchBid(lead)}
                disabled={launchingBid === lead.id}
                className="bg-purple-600 text-white px-2.5 py-1 text-xs rounded-md hover:bg-purple-700 transition"
            >
                {launchingBid === lead.id ? '...' : 'Bid'}
            </button>
        </div>
    )}
</td>

</tr>

)
})}

</tbody>

</table>

</div>

)}

</div>

</div>

{/* NEW SUPPLIER SELECTION MODAL */}
{showBidModal && selectedLead && matchingSuppliers[selectedLead.id] && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Select Suppliers for {selectedLead.business_name}</h2>
                <button onClick={() => setShowBidModal(false)} className="text-gray-500 hover:text-gray-700">
                    ✕
                </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                    <span className="font-bold">Market Average Rate:</span> {matchingSuppliers[selectedLead.id]?.marketAvgRate}¢/kWh
                    <span className="ml-4 font-bold">Competitiveness:</span> {matchingSuppliers[selectedLead.id]?.competitiveness}
                </p>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {matchingSuppliers[selectedLead.id]?.suppliers?.map((supplier: any) => (
                    <label key={supplier.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="checkbox"
                            className="mt-1"
                            checked={matchingSuppliers[selectedLead.id]?.selected?.includes(supplier.id)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setMatchingSuppliers(prev => ({
                                    ...prev,
                                    [selectedLead.id]: {
                                        ...prev[selectedLead.id],
                                        selected: checked
                                            ? [...(prev[selectedLead.id].selected || []), supplier.id]
                                            : (prev[selectedLead.id].selected || []).filter((id: string) => id !== supplier.id)
                                    }
                                }));
                            }}
                        />
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <p className="font-bold">{supplier.company_name}</p>
                                <p className="text-sm font-mono">Score: {Math.round(supplier.overall_score * 100)}%</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                <div>
                                    <p className="text-gray-500">Rate</p>
                                    <p className="font-bold text-green-600">{supplier.best_rate}¢/kWh</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Term</p>
                                    <p className="font-bold">{supplier.best_term} mo</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Est. Savings</p>
                                    <p className="font-bold text-green-600">${Math.round(supplier.estimated_savings).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </label>
                ))}
            </div>

            {crossSell && crossSell.services.length > 0 && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-bold text-purple-800 mb-2">🎯 Cross-Sell Opportunities</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {crossSell.services.slice(0, 4).map((service: any) => (
                            <div key={service.serviceId} className="bg-white p-2 rounded border border-purple-200">
                                <p className="font-medium text-sm">{service.serviceName}</p>
                                <p className="text-xs text-gray-600">{service.rationale}</p>
                                <p className="text-xs text-green-600 mt-1">
                                    +${service.commissionPotential.toLocaleString()} commission
                                </p>
                            </div>
                        ))}
                    </div>
                    {crossSell.bundles.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm font-semibold">Best Bundle:</p>
                            <p className="text-sm">{crossSell.bundles[0].bundleName} - Save ${crossSell.bundles[0].savingsVsAlaCarte.toLocaleString()}/year</p>
                            <button className="mt-2 bg-purple-600 text-white px-3 py-1 rounded text-xs">
                                Generate Bundle Proposal
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                    onClick={() => setShowBidModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    Cancel
                </button>
                <button
                    onClick={confirmBidLaunch}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    Launch Bid ({matchingSuppliers[selectedLead.id]?.selected?.length || 0} suppliers)
                </button>
            </div>
        </div>
    </div>
)}

</div>

)

}