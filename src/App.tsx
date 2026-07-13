import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { 
  Users, UserPlus, LayoutDashboard, Briefcase, FileText, Settings, 
  Search, Bell, ChevronDown, CheckCircle, XCircle, Clock, Calendar, 
  Phone, Mail, MessageCircle, DollarSign, Activity, Target, LogOut,
  Building, MapPin, Globe, Share2, AlertCircle, Filter, FileSpreadsheet,
  Plus, Eye, Upload, Copy, ExternalLink, AlertTriangle, Flame, Check, Edit2, Save,
  Trash2, Download, Database, Lock
} from 'lucide-react';
import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';

// --- CONSTANTS & CONFIG ---
const ROLES = {
  ADMIN: 'Super Admin',
  LEAD_TL: 'Lead TL',
  PRE_SALES: 'Pre-Sales',
  BDM: 'BDM'
};

const FIREBASE_ADMIN_DOC_PATH = import.meta.env.VITE_FIREBASE_ADMIN_DOC_PATH || 'admin/config';

const getAdminDocRef = () => {
  if (!db) return null;
  const pathSegments = FIREBASE_ADMIN_DOC_PATH.split('/').map(segment => segment.trim()).filter(Boolean);
  if (pathSegments.length === 0 || pathSegments.length % 2 !== 0) return null;
  const [collectionPath, documentPath, ...additionalSegments] = pathSegments;
  return doc(db, collectionPath, documentPath, ...additionalSegments);
};

const LEAD_SOURCES = [
  'LinkedIn Outreach', 'Email Marketing', 'Cold Email', 'Facebook Campaign',
  'Google Ads', 'Referral', 'WhatsApp Campaign', 'Instagram Outreach',
  'Upwork', 'Fiverr', 'Clutch', 'Manual Research', 'Cold Calling',
  'Website Inquiry', 'TradeIndia', 'IndiaMart', 'Other'
];

const SERVICES = ['Website Development', 'SEO', 'Social Media', 'Ads Management'];

const SALES_STAGES = [
  'Assigned', 'Contacted', 'Follow-Up', 'Meeting Scheduled', 'Meeting Done',
  'Requirement Gathering', 'Proposal Shared', 'Negotiation', 'Decision Pending',
  'Won', 'Lost', 'Not Interested'
];

const LOST_REASONS = [
  'Budget issue', 'Competitor selected', 'No response', 'No requirement', 
  'Timeline issue', 'Trust issue'
];

const generateId = () => Math.random().toString(36).substr(2, 9);
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizePassword = (password = '') => String(password).trim();

// --- INITIAL DATABASE STATE ---
const INITIAL_USERS = [];

const initialLeads = [
  {
    id: generateId(),
    companyName: 'TechCorp India', contactPerson: 'Arun Sharma', email: 'arun@techcorp.in', phone: '+91 9876543210', whatsapp: '+91 9876543210', country: 'India', website: 'https://techcorp.in',
    service: 'Website Development', source: 'LinkedIn Outreach',
    status: 'ASSIGNED', stage: 'Meeting Scheduled', assignedTo: 'u4', addedBy: 'u3',
    expectedValue: 5000, probability: 75,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    nextFollowUp: new Date(Date.now() + 3600000).toISOString(),
    timeline: [{ date: new Date(Date.now() - 86400000 * 5).toISOString(), action: 'Lead added', user: 'Amit (Pre-Sales)' }],
    communications: [
      { date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'Call', notes: 'Client is interested in a complete revamp. Scheduled a meeting.', expectedValue: 5000, probability: 75 }
    ]
  }
];

// --- CONTEXT SETUP FOR PERFORMANCE ---
const CRMContext = createContext();

// --- HELPER COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
      <div className={`p-4 rounded-full ${colorClasses[color]}`}><Icon size={24} /></div>
      <div><p className="text-sm font-medium text-slate-500">{title}</p><h3 className="text-2xl font-bold text-slate-800">{value}</h3></div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  let styles = "bg-slate-100 text-slate-700";
  if(status === 'NEW LEAD') styles = "bg-blue-100 text-blue-800";
  if(status === 'ASSIGNED') styles = "bg-indigo-100 text-indigo-800";
  if(status === 'WON') styles = "bg-emerald-100 text-emerald-800";
  if(['REJECTED','INVALID','DUPLICATE'].includes(status)) styles = "bg-red-100 text-red-800";
  return <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${styles}`}>{status}</span>;
};

const TopBar = () => {
  const { currentView, leads, users, currentUser, handleLogout, reminders, setSelectedLead } = useContext(CRMContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return leads.filter(l => 
      l.companyName?.toLowerCase().includes(query) || l.contactPerson?.toLowerCase().includes(query) ||
      l.phone?.includes(query) || l.website?.toLowerCase().includes(query) || (l.whatsapp && l.whatsapp.includes(query))
    );
  }, [searchQuery, leads]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center space-x-4 w-full md:w-1/2 lg:w-1/3 relative">
        <h2 className="text-xl font-bold text-slate-800 hidden md:block mr-4">{currentView.replace('_', ' ').toUpperCase()}</h2>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-slate-400" /></div>
          <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Search leads, phone, website..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          
          {showResults && searchQuery && (
            <div className="absolute top-full left-0 w-full md:w-[150%] mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-50">
              <div className="p-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100 uppercase tracking-wider">Search Results ({searchResults.length})</div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 text-center">No leads found.</div>
              ) : (
                searchResults.map(lead => (
                  <div key={lead.id} onClick={() => { setSelectedLead(lead); setShowResults(false); setSearchQuery(''); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-sm">{lead.companyName || lead.contactPerson}</span>
                      <StatusBadge status={lead.stage || lead.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{lead.companyName ? lead.contactPerson : 'Individual'} • {lead.phone || 'No phone'}</span>
                      {lead.assignedTo && <span className="text-blue-600 font-medium">Assigned: {users.find(u => u.id === lead.assignedTo)?.name || 'Unknown'}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <button className="text-slate-400 hover:text-slate-600 relative">
          <Bell size={20} />
          {reminders.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
        
        <div className="flex items-center space-x-3 border-l border-slate-200 pl-6">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-sm hidden md:block">
            <p className="font-semibold text-slate-800">{currentUser.name.split(' ')[0]}</p>
            <p className="text-xs text-slate-500">{currentUser.role}</p>
          </div>
          <button onClick={handleLogout} className="ml-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

const Navigation = () => {
  const { currentView, setCurrentView, currentUser } = useContext(CRMContext);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: Object.values(ROLES) },
    { id: 'add_lead', label: 'Add Lead', icon: UserPlus, roles: [ROLES.PRE_SALES, ROLES.ADMIN, ROLES.LEAD_TL] },
    { id: 'lead_review', label: 'Lead Review', icon: Search, roles: [ROLES.LEAD_TL, ROLES.ADMIN] },
    { id: 'database', label: 'Lead Database', icon: Database, roles: [ROLES.ADMIN, ROLES.LEAD_TL] },
    { id: 'pipeline', label: 'Sales Pipeline', icon: Activity, roles: [ROLES.BDM, ROLES.ADMIN] },
    { id: 'projects', label: 'Projects', icon: Briefcase, roles: [ROLES.ADMIN, ROLES.BDM] },
    { id: 'team', label: 'Team Management', icon: Users, roles: [ROLES.ADMIN] },
  ];
  return (
    <nav className="space-y-1 p-4">
      {navItems.filter(item => item.roles.includes(currentUser.role)).map(item => (
        <button key={item.id} onClick={() => setCurrentView(item.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentView === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
          <item.icon size={20} />
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

const DashboardView = () => {
  const { currentUser, stats, leads, reminders, neglectedLeads, setSelectedLead } = useContext(CRMContext);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentUser.role === ROLES.ADMIN && (
          <><StatCard title="Total Leads" value={stats.totalLeads} icon={Users} color="blue" /><StatCard title="Active Deals" value={stats.myActiveDeals} icon={Activity} color="amber" /><StatCard title="Pipeline Value" value={`$${stats.pipelineValue.toLocaleString()}`} icon={DollarSign} color="indigo" /><StatCard title="Total Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={CheckCircle} color="green" /></>
        )}
        {currentUser.role === ROLES.LEAD_TL && (
          <><StatCard title="Leads Pending Review" value={stats.newLeads} icon={Clock} color="amber" /><StatCard title="Assigned Today" value={stats.assigned} icon={UserPlus} color="blue" /><StatCard title="Total Added" value={stats.totalLeads} icon={Database} color="indigo" /><StatCard title="Rejected/Spam" value={leads.filter(l => ['REJECTED','INVALID','DUPLICATE'].includes(l.status)).length} icon={XCircle} color="red" /></>
        )}
        {currentUser.role === ROLES.PRE_SALES && (
          <><StatCard title="My Added Leads" value={leads.filter(l => l.addedBy === currentUser.id).length} icon={Users} color="blue" /><StatCard title="Converted to Pipeline" value={leads.filter(l => l.addedBy === currentUser.id && l.stage).length} icon={Activity} color="green" /><StatCard title="Daily Target" value="15" icon={Target} color="indigo" /></>
        )}
        {currentUser.role === ROLES.BDM && (
          <><StatCard title="My Active Deals" value={stats.myActiveDeals} icon={Briefcase} color="blue" /><StatCard title="Meetings Scheduled" value={reminders.length} icon={Calendar} color="amber" /><StatCard title="My Pipeline Value" value={`$${stats.pipelineValue.toLocaleString()}`} icon={DollarSign} color="indigo" /><StatCard title="Closed Won Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={CheckCircle} color="green" /></>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['Super Admin', 'BDM'].includes(currentUser.role) && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center"><Bell size={20} className="mr-2 text-amber-500" /> Upcoming Reminders & Follow-ups</h3>
              {reminders.length === 0 ? (
                <p className="text-slate-500 text-sm p-4 bg-slate-50 rounded text-center">No upcoming follow-ups scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {reminders.map(lead => {
                    const isPast = new Date(lead.nextFollowUp) < new Date();
                    return (
                      <div key={lead.id} onClick={() => setSelectedLead(lead)} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg cursor-pointer transition-colors">
                        <div className="flex flex-col"><span className="font-bold text-slate-800 text-sm">{lead.companyName || lead.contactPerson}</span><span className="text-xs text-slate-500">{lead.companyName ? lead.contactPerson : 'Individual'} • {lead.stage}</span></div>
                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${isPast ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><Clock size={12} /><span>{new Date(lead.nextFollowUp).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {neglectedLeads.length > 0 && (
              <div className="bg-red-50/50 rounded-xl shadow-sm border border-red-200 p-6 animate-in fade-in">
                <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-red-600" /> Deals Slipping Away ({'>'} 5 Days Idle)
                </h3>
                <div className="space-y-3">
                  {neglectedLeads.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedLead(lead)} className="flex items-center justify-between p-4 bg-white hover:bg-red-50 border border-red-100 rounded-lg cursor-pointer transition-colors shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{lead.companyName || lead.contactPerson}</span>
                        <span className="text-xs text-slate-500">Last activity: {new Date(lead.timeline[0]?.date).toLocaleDateString()}</span>
                      </div>
                      <button className="text-xs font-bold text-red-600 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">Follow Up Now</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent CRM Activity</h3>
          <div className="space-y-4">
            {leads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-start space-x-3 pb-4 border-b border-slate-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Activity size={18} /></div>
                <div>
                  <p className="text-sm text-slate-800 font-medium truncate w-40">{lead.companyName || lead.contactPerson}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{lead.timeline[0]?.action} by {lead.timeline[0]?.user}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(lead.timeline[0]?.date).toLocaleString(undefined, {month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AddLeadView = () => {
  const { addLead, addBulkLeads } = useContext(CRMContext);
  const [activeTab, setActiveTab] = useState('single');
  const [formData, setFormData] = useState({
    companyName: '', contactPerson: '', email: '', phone: '', whatsapp: '',
    country: '', website: '', businessType: '', taxId: '', linkedin: '',
    service: SERVICES[0], source: LEAD_SOURCES[0], notes: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email && !formData.phone) {
      setError('At least one contact method (Email or Phone) is required.');
      return;
    }
    addLead(formData);
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const lines = text.split('\n');
      const newBulkLeads = [];
      for (let i = 1; i < lines.length; i++) {
        if(!lines[i].trim()) continue;
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/(^"|"$)/g, '').trim());
        if (cols.length >= 7) {
          newBulkLeads.push({
            companyName: cols[0], contactPerson: cols[1], email: cols[2], phone: cols[3], country: cols[4], service: cols[5], source: cols[6],
            website: cols[7] || '', whatsapp: '', businessType: '', taxId: '', linkedin: '', notes: 'Bulk uploaded from CSV'
          });
        }
      }
      if (newBulkLeads.length > 0) addBulkLeads(newBulkLeads);
      else setError("No valid leads found. Check CSV format.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Add New Lead</h2><p className="text-sm text-slate-500 mt-1">Pre-Sales Lead Data Entry</p></div>
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
          <button onClick={() => setActiveTab('single')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'single' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Single Entry</button>
          <button onClick={() => setActiveTab('bulk')} className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center transition-colors ${activeTab === 'bulk' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}><Upload size={14} className="mr-1"/> Bulk Upload</button>
        </div>
      </div>
      
      {activeTab === 'single' ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center space-x-2"><AlertCircle size={20} /> <span>{error}</span></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Mandatory Information</h3>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label><input type="text" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, companyName: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label><input required type="text" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, contactPerson: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Country *</label><input required type="text" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, country: e.target.value})} /></div>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-800 font-medium mb-3">Provide at least ONE contact method</p>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input type="email" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label><input type="tel" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                </div>
              </div>
              
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Service Interested *</label><select className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, service: e.target.value})}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Lead Source *</label><select className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, source: e.target.value})}>{LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="space-y-6">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Optional Information</h3>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Website URL (If available)</label><input type="url" placeholder="https://" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, website: e.target.value})} /><p className="text-xs text-slate-400 mt-1">Leave blank if client needs web dev or has no site.</p></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label><input type="tel" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, whatsapp: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn Profile</label><input type="url" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, linkedin: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Initial Notes/Response</label><textarea rows="4" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-200 flex justify-end"><button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">Submit Lead to TL</button></div>
        </form>
      ) : (
        <div className="p-8 text-center space-y-6">
          <div className="bg-blue-50 text-blue-800 p-6 rounded-xl border border-blue-100 inline-block max-w-2xl text-left shadow-sm">
            <h3 className="font-bold mb-2 flex items-center text-lg"><FileSpreadsheet size={20} className="mr-2"/> CSV Bulk Upload Instructions</h3>
            <p className="text-sm mb-4">Upload a CSV file with exactly 8 columns in this order (first row must be headers):</p>
            <code className="bg-white p-3 rounded-lg border border-blue-200 text-sm font-mono block mb-4 overflow-x-auto whitespace-nowrap shadow-sm text-slate-800">
              Company Name, Contact Person, Email, Phone, Country, Service, Source, Website
            </code>
            <p className="text-xs text-blue-600 mb-2 font-medium">Example Row (With Website):</p>
            <code className="bg-white p-3 rounded-lg border border-blue-200 text-xs font-mono block mb-4 overflow-x-auto whitespace-nowrap text-slate-600">"TechCorp","John Doe","john@tech.com","+1234567890","USA","Website Development","Google Ads","https://techcorp.com"</code>
            <p className="text-xs text-blue-600 mb-2 font-medium mt-3">Example Row (Without Website - Leave blank):</p>
            <code className="bg-white p-3 rounded-lg border border-blue-200 text-xs font-mono block mb-4 overflow-x-auto whitespace-nowrap text-slate-600">"Global Traders","Rajesh Kumar","rajesh@global.com","+987654321","UAE","SEO","Referral",""</code>
          </div>
          <div className="flex justify-center mt-6"><label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center"><Upload size={18} className="mr-2" /> Select & Upload CSV File<input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} /></label></div>
          {error && <p className="text-red-500 text-sm mt-4 font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
};

const LeadReviewView = () => {
  const { users, leads, currentUser, updateLeadTLStatus, setSelectedLead, showNotification } = useContext(CRMContext);
  const bdms = users.filter(u => u.role === ROLES.BDM);
  const pendingLeads = leads.filter(l => l.stage === null);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectAll = (e) => { if(e.target.checked) setSelectedIds(pendingLeads.map(l => l.id)); else setSelectedIds([]); };
  const toggleSelect = (id) => { if(selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id)); else setSelectedIds([...selectedIds, id]); };

  const handleBulkAction = (action, value) => {
    if(selectedIds.length === 0) return showNotification("Select leads first.");
    selectedIds.forEach(id => {
      if (action === 'assign') updateLeadTLStatus(id, 'ASSIGNED', value);
      else updateLeadTLStatus(id, value);
    });
    showNotification(`Successfully updated ${selectedIds.length} leads.`);
    setSelectedIds([]); 
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
        <div><h2 className="text-xl font-bold text-slate-800">Lead Assignment Pool</h2><p className="text-sm text-slate-500">Review quality and assign to Sales Pipeline</p></div>
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 shadow-sm animate-in fade-in zoom-in duration-200">
            <span className="text-sm font-bold text-blue-700 bg-white px-2 py-1 rounded shadow-sm">{selectedIds.length} Selected</span><div className="h-5 w-px bg-blue-200"></div>
            <select className="text-xs font-medium rounded border-slate-300 py-1.5 pl-2 pr-6 focus:ring-blue-500" onChange={(e) => { handleBulkAction('status', e.target.value); e.target.value = ""; }} defaultValue=""><option value="" disabled>Bulk Mark As...</option><option value="DUPLICATE">Duplicate</option><option value="INVALID">Invalid</option><option value="REJECTED">Reject</option></select>
            <select className="text-xs font-bold rounded border-blue-400 bg-blue-600 text-white py-1.5 pl-2 pr-6 focus:ring-blue-500" onChange={(e) => { handleBulkAction('assign', e.target.value); e.target.value = ""; }} defaultValue=""><option value="" disabled>Bulk Assign To BDM...</option>{bdms.map(bdm => <option key={bdm.id} value={bdm.id}>{bdm.name}</option>)}</select>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
            <tr>
              <th className="p-4 w-12 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={pendingLeads.length > 0 && selectedIds.length === pendingLeads.length} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"/></th>
              <th className="p-4 font-semibold">Date Added</th><th className="p-4 font-semibold">Company / Contact</th><th className="p-4 font-semibold">Source & Service</th><th className="p-4 font-semibold">Current Status</th><th className="p-4 font-semibold text-right">TL Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingLeads.map(lead => (
              <tr key={lead.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.includes(lead.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"/></td>
                <td className="p-4">{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td className="p-4"><div className="font-medium text-slate-900">{lead.companyName || lead.contactPerson}</div><div className="text-xs text-slate-500">{lead.companyName ? lead.contactPerson : 'Individual Lead'}</div></td>
                <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600 mb-1 border border-slate-200 uppercase tracking-wider">{lead.source}</span><div className="text-xs text-blue-600 font-medium">{lead.service}</div></td>
                <td className="p-4"><StatusBadge status={lead.status} /></td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => setSelectedLead(lead)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Lead Details"><Eye size={18} /></button>
                    <select className="text-xs rounded border-slate-300 py-1 pl-2 pr-6" onChange={(e) => { if(['INVALID','REJECTED','DUPLICATE'].includes(e.target.value)) { updateLeadTLStatus(lead.id, e.target.value); e.target.value = ""; } }} defaultValue=""><option value="" disabled>Reject/Mark...</option><option value="DUPLICATE">Duplicate</option><option value="INVALID">Invalid</option><option value="REJECTED">Reject</option></select>
                    <select className="text-xs rounded border-blue-300 bg-blue-50 text-blue-700 font-medium py-1 pl-2 pr-6" onChange={(e) => { updateLeadTLStatus(lead.id, 'ASSIGNED', e.target.value); e.target.value = ""; }} defaultValue=""><option value="" disabled>Assign BDM...</option>{bdms.map(bdm => <option key={bdm.id} value={bdm.id}>{bdm.name}</option>)}</select>
                  </div>
                </td>
              </tr>
            ))}
            {pendingLeads.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No leads pending review.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeadDatabaseView = () => {
  const { users, leads, currentUser, updateLeadTLStatus, setSelectedLead, deleteLead, exportToCSV, showNotification, setDeletePrompt } = useContext(CRMContext);
  const bdms = users.filter(u => u.role === ROLES.BDM);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-10rem)]">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 rounded-t-xl gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Master Lead Database</h2><p className="text-sm text-slate-500">View, reassign, delete, or export all CRM leads.</p></div>
        <button onClick={exportToCSV} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center shadow-sm">
          <Download size={16} className="mr-2" /> Export to Excel
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-white border-b border-slate-200 text-slate-700 sticky top-0 shadow-sm z-10">
            <tr>
              <th className="p-4 font-semibold">Lead Info</th><th className="p-4 font-semibold">Service & Source</th>
              <th className="p-4 font-semibold">Stage / Status</th><th className="p-4 font-semibold">Assigned BDM</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-900">{lead.companyName || lead.contactPerson}</div>
                  <div className="text-xs text-slate-500">{lead.contactPerson} • {lead.country}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-blue-700">{lead.service}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">{lead.source}</div>
                </td>
                <td className="p-4">
                  {lead.stage ? <span className="font-bold text-xs bg-slate-200 text-slate-800 px-2 py-1 rounded">{lead.stage}</span> : <StatusBadge status={lead.status} />}
                </td>
                <td className="p-4">
                  <select className="text-xs rounded border-slate-300 py-1 pl-2 pr-6 w-32 focus:ring-blue-500 bg-white" 
                    value={lead.assignedTo || ''} 
                    onChange={(e) => {
                      updateLeadTLStatus(lead.id, 'ASSIGNED', e.target.value);
                      showNotification("Lead reassigned successfully.");
                    }}>
                    <option value="" disabled>Unassigned</option>
                    {bdms.map(bdm => <option key={bdm.id} value={bdm.id}>{bdm.name}</option>)}
                  </select>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => setSelectedLead(lead)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye size={16} /></button>
                    {currentUser.role === ROLES.ADMIN && (
                      <button onClick={() => setDeletePrompt(lead.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Lead Permanently"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">No leads found in database.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KanbanBoardView = () => {
  const { leads, currentUser, users, updateSalesStage, setSelectedLead, setLostPrompt } = useContext(CRMContext);
  const [pipelineFilter, setPipelineFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL'); // NEW FILTER STATE
  
  const pipelineLeads = leads.filter(l => 
    l.stage !== null && 
    (currentUser.role === ROLES.ADMIN || l.assignedTo === currentUser.id) &&
    (pipelineFilter === 'ALL' || l.assignedTo === pipelineFilter)
  );

  const onDragStart = (e, leadId) => e.dataTransfer.setData('leadId', leadId);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, stage) => {
    const leadId = e.dataTransfer.getData('leadId');
    if(stage === 'Lost') { setLostPrompt(leadId); }
    else updateSalesStage(leadId, stage);
  };

  // Determine which stages to display based on the filter
  const visibleStages = stageFilter === 'ALL' ? SALES_STAGES : [stageFilter];

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Sales Pipeline</h2><p className="text-sm text-slate-500">Drag & drop leads to update stages.</p></div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* STAGE FILTRATION DROPDOWN FOR BDMS */}
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 shadow-inner">
            <Filter size={16} className="text-blue-500"/>
            <span className="text-xs font-bold text-blue-700 uppercase">View Stage:</span>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="text-sm border-0 bg-transparent font-bold text-blue-800 py-1 pl-1 pr-6 focus:ring-0 cursor-pointer">
              <option value="ALL">All Stages</option>
              {SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {currentUser.role === ROLES.ADMIN && (
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">
              <Filter size={16} className="text-slate-400"/>
              <span className="text-xs font-bold text-slate-600 uppercase">Track BDM Pipeline:</span>
              <select value={pipelineFilter} onChange={e => setPipelineFilter(e.target.value)} className="text-sm border-0 bg-transparent font-bold text-blue-700 py-1 pl-1 pr-6 focus:ring-0 cursor-pointer">
                <option value="ALL">All BDMs</option>
                {users.filter(u => u.role === ROLES.BDM).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto flex space-x-4 pb-4 snap-x">
        {visibleStages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-80 bg-slate-100 rounded-xl flex flex-col snap-start" onDragOver={onDragOver} onDrop={(e) => onDrop(e, stage)}>
            <div className="p-3 border-b border-slate-200 bg-slate-200/50 rounded-t-xl flex justify-between items-center"><h3 className="font-semibold text-slate-700 text-sm">{stage}</h3><span className="bg-slate-300 text-slate-700 text-xs py-0.5 px-2 rounded-full font-medium">{pipelineLeads.filter(l => l.stage === stage).length}</span></div>
            
            <div className="flex-1 p-2 space-y-3 overflow-y-auto min-h-[200px]">
              {pipelineLeads.filter(l => l.stage === stage).map(lead => {
                const isNeglected = (new Date().getTime() - new Date(lead.timeline[0]?.date).getTime()) > 5 * 24 * 60 * 60 * 1000;
                return (
                  <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead.id)} onClick={() => setSelectedLead(lead)} 
                       className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-all active:cursor-grabbing group
                       ${isNeglected ? 'border-red-300 hover:border-red-500' : 'border-slate-200 hover:border-blue-400'}`}>
                    
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">{lead.companyName || lead.contactPerson}</h4>
                      {lead.probability >= 75 ? (
                        <span className="text-xs font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded flex items-center shadow-sm"><Flame size={12} className="mr-0.5" /> Hot</span>
                      ) : (lead.probability > 0 && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1 rounded">{lead.probability}%</span>)}
                    </div>
                    
                    {isNeglected && <div className="flex items-center text-[10px] text-red-600 font-bold mb-2 bg-red-50 px-1.5 py-0.5 rounded w-max border border-red-100"><AlertTriangle size={10} className="mr-1" /> Needs Attention</div>}

                    <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                      <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{lead.service}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wide">{lead.source}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400 border-t border-slate-50 pt-2">
                      <div className="flex items-center space-x-1"><DollarSign size={12} /><span className="font-medium text-slate-600">{lead.expectedValue || 0}</span></div>
                      {lead.nextFollowUp && (
                        <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded ${new Date(lead.nextFollowUp) < new Date() ? 'text-red-600 bg-red-50 font-medium' : 'text-amber-600 bg-amber-50 font-medium'}`}>
                          <Clock size={12} /><span>{new Date(lead.nextFollowUp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProjectsView = () => {
  const { projects } = useContext(CRMContext);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200"><h2 className="text-xl font-bold text-slate-800">Project Execution (Post-Won)</h2><p className="text-sm text-slate-500">Automated projects generated from closed won deals.</p></div>
      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12 text-slate-500"><Briefcase size={48} className="mx-auto mb-4 text-slate-300" /><p>No projects yet. Close a deal to automatically generate a project here.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <div key={proj.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="font-bold text-lg text-slate-800">{proj.clientName}</h3><p className="text-sm text-blue-600 font-medium">{proj.service}</p></div>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold uppercase">{proj.status}</span>
                </div>
                <div className="space-y-2 mt-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Value:</span><span className="font-medium text-slate-800">${proj.value}</span></div><div className="flex justify-between"><span className="text-slate-500">Start Date:</span><span className="font-medium text-slate-800">{new Date(proj.createdAt).toLocaleDateString()}</span></div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TeamManagementView = () => {
  const { users, addUser, removeUser, leads, currentUser } = useContext(CRMContext);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState(ROLES.BDM);
  
  const handleAddUser = (e) => { 
    e.preventDefault(); 
    if(newUserName && newUserEmail && newUserPassword) { 
      addUser({ name: newUserName.trim(), email: normalizeEmail(newUserEmail), password: normalizePassword(newUserPassword), role: newUserRole }); 
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword('');
    } 
  };
  
  const getUserStats = (userId, role) => {
    if (role !== ROLES.BDM) return null;
    const userLeads = leads.filter(l => l.assignedTo === userId);
    const active = userLeads.filter(l => l.stage && !['Won', 'Lost', 'Not Interested'].includes(l.stage)).length;
    const won = userLeads.filter(l => l.stage === 'Won').length;
    return { active, won };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-slate-800">Team Management</h2><p className="text-sm text-slate-500 mt-1">Create and manage secure employee accounts.</p></div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center shadow-sm"><Users size={16} className="mr-2"/> {users.length} Users</div>
        </div>
        <div className="p-6">
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input required type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-blue-500 shadow-sm" placeholder="e.g. John Doe"/></div>
            <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-blue-500 shadow-sm" placeholder="john@crm.com"/></div>
            <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Password</label><input required type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-blue-500 shadow-sm" placeholder="Temporary Pass"/></div>
            <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Assign Role</label><select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-blue-500 shadow-sm">{Object.values(ROLES).filter(r => r !== ROLES.ADMIN).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div className="md:col-span-1"><button type="submit" className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"><Plus size={18} className="inline mr-1" /> Add User</button></div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700"><tr><th className="p-4 font-semibold">Employee Info</th><th className="p-4 font-semibold">System Role</th><th className="p-4 font-semibold text-center">Active Deals</th><th className="p-4 font-semibold text-center">Deals Won</th><th className="p-4 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {users.map(u => {
              const s = getUserStats(u.id, u.role);
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="p-4"><div className="flex items-center"><div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mr-3 text-xs">{u.name.charAt(0)}</div><div><div className="font-bold text-slate-900">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></div></div></td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">{u.role}</span></td>
                  <td className="p-4 text-center">{s ? <span className="font-medium text-slate-700">{s.active}</span> : '-'}</td>
                  <td className="p-4 text-center">{s ? <span className="font-bold text-emerald-600">{s.won}</span> : '-'}</td>
                  <td className="p-4 text-right">
                    {u.id !== currentUser.id && (
                      <button onClick={() => removeUser(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete User Account"><Trash2 size={18}/></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeadDetailModal = () => {
  const { selectedLead: lead, setSelectedLead: onClose, currentUser, updateLeadDetails, addCommunication, updateSalesStage, showNotification, setLostPrompt } = useContext(CRMContext);
  
  const [commType, setCommType] = useState('Call');
  const [commNotes, setCommNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().slice(0, 16) : '');
  const [expectedValue, setExpectedValue] = useState(lead.expectedValue || 0);
  const [probability, setProbability] = useState(lead.probability || 0);
  const [copiedField, setCopiedField] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ companyName: lead.companyName || '', contactPerson: lead.contactPerson || '', email: lead.email || '', phone: lead.phone || '', whatsapp: lead.whatsapp || '', country: lead.country || '', website: lead.website || '' });

  const handleSaveDetails = () => { updateLeadDetails(lead.id, editForm); setIsEditing(false); showNotification('Details updated!'); };
  const handleCopy = (text, field) => { navigator.clipboard.writeText(text); setCopiedField(field); setTimeout(() => setCopiedField(null), 2000); };
  
  const handleSaveComm = () => {
    if(!commNotes && !nextFollowUp && expectedValue === lead.expectedValue && probability === lead.probability) return;
    addCommunication(lead.id, { type: commType, notes: commNotes || 'Updated pipeline attributes.', nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : null, expectedValue, probability });
    setCommNotes(''); showNotification("Activity logged.");
  };

  const handleStageChange = (e) => {
    const stage = e.target.value;
    if(stage === 'Lost') { onClose(null); setLostPrompt(lead.id); } 
    else updateSalesStage(lead.id, stage);
  };
  
  const canEdit = currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.LEAD_TL || (currentUser.role === ROLES.BDM && lead.assignedTo === currentUser.id);

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">{lead.companyName || lead.contactPerson}</h2>
              {!lead.stage ? (<StatusBadge status={lead.status} />) : canEdit ? (
                <select value={lead.stage} onChange={handleStageChange} className="text-sm font-bold bg-blue-50 text-blue-700 border-blue-200 rounded-lg py-1 focus:ring-blue-500">{SALES_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              ) : (<span className="text-sm font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">{lead.stage}</span>)}
              {canEdit && !isEditing && (<button onClick={() => setIsEditing(true)} className="text-xs bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg flex items-center border border-slate-200 shadow-sm font-medium"><Edit2 size={14} className="mr-1.5"/> Edit Lead</button>)}
            </div>
            <p className="text-slate-500 flex items-center space-x-4 text-sm"><span className="flex items-center"><UserPlus size={14} className="mr-1"/> {lead.contactPerson}</span><span className="flex items-center"><MapPin size={14} className="mr-1"/> {lead.country}</span>{lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:underline"><Globe size={14} className="mr-1"/> Website</a>}</p>
          </div>
          <button onClick={() => onClose(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><XCircle size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 p-6 border-r border-slate-200 space-y-8 overflow-y-auto">
            {isEditing ? (
              <div className="bg-slate-50 p-5 rounded-xl border border-blue-300 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3"><h3 className="font-bold text-slate-800 flex items-center"><Edit2 size={18} className="mr-2 text-blue-600"/> Edit Lead Details</h3><div className="flex space-x-2"><button onClick={() => setIsEditing(false)} className="text-xs text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium">Cancel</button><button onClick={handleSaveDetails} className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 flex items-center shadow-sm"><Save size={14} className="mr-1.5"/> Save Updates</button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Contact Person</label><input className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.contactPerson} onChange={e=>setEditForm({...editForm, contactPerson:e.target.value})}/></div>
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Company Name</label><input className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.companyName} onChange={e=>setEditForm({...editForm, companyName:e.target.value})}/></div>
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Email</label><input type="email" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.email} onChange={e=>setEditForm({...editForm, email:e.target.value})}/></div>
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Phone</label><input type="tel" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.phone} onChange={e=>setEditForm({...editForm, phone:e.target.value})}/></div>
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">WhatsApp</label><input type="tel" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.whatsapp} onChange={e=>setEditForm({...editForm, whatsapp:e.target.value})}/></div>
                  <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Country</label><input className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.country} onChange={e=>setEditForm({...editForm, country:e.target.value})}/></div>
                  <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-500 mb-1 block">Website</label><input type="url" className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500" value={editForm.website} onChange={e=>setEditForm({...editForm, website:e.target.value})}/></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4">
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Email Address</span>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      {lead.email ? <a href={`mailto:${lead.email}`} className="font-medium text-blue-600 hover:underline truncate text-sm mr-2">{lead.email}</a> : <span className="text-sm font-medium text-slate-400">N/A</span>}
                      {lead.email && <button onClick={() => handleCopy(lead.email, 'email')} className="text-slate-400 hover:text-slate-800 p-1 bg-slate-50 rounded">{copiedField === 'email' ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}</button>}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Phone Number</span>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      {lead.phone ? <a href={`tel:${lead.phone}`} className="font-medium text-slate-700 hover:text-blue-600 hover:underline text-sm mr-2">{lead.phone}</a> : <span className="text-sm font-medium text-slate-400">N/A</span>}
                      {lead.phone && <button onClick={() => handleCopy(lead.phone, 'phone')} className="text-slate-400 hover:text-slate-800 p-1 bg-slate-50 rounded">{copiedField === 'phone' ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}</button>}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 md:pl-2">
                  <div>
                    <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">WhatsApp Quick Connect</span>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 hover:border-emerald-300 transition-colors">
                      {lead.whatsapp ? <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-bold text-emerald-600 hover:underline flex items-center text-sm mr-2"><MessageCircle size={14} className="mr-1"/> Message</a> : <span className="text-sm font-medium text-slate-400">N/A</span>}
                      {lead.whatsapp && <button onClick={() => handleCopy(lead.whatsapp, 'wa')} className="text-slate-400 hover:text-slate-800 p-1 bg-slate-50 rounded">{copiedField === 'wa' ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}</button>}
                    </div>
                  </div>
                  <div className="flex space-x-2"><div className="flex-1"><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Service</span><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1.5 rounded block text-center truncate">{lead.service}</span></div><div className="flex-1"><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wider mb-1">Source</span><span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1.5 rounded block text-center truncate">{lead.source}</span></div></div>
                </div>
              </div>
            )}

            {canEdit && lead.stage && (
              <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center"><MessageCircle size={18} className="mr-2 text-blue-600"/> Log Activity & Update</h3>
                <div className="grid grid-cols-4 gap-2 mb-3">{['Call', 'Email', 'Meeting', 'WhatsApp'].map(type => (<button key={type} onClick={() => setCommType(type)} className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${commType === type ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{type}</button>))}</div>
                <textarea value={commNotes} onChange={e => setCommNotes(e.target.value)} placeholder={`Write notes from this ${commType.toLowerCase()}...`} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500" rows="3"></textarea>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Set Next Follow-up</label><input type="datetime-local" value={nextFollowUp} onChange={e => setNextFollowUp(e.target.value)} className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Expected Value ($)</label><input type="number" value={expectedValue} onChange={e => setExpectedValue(e.target.value)} className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Probability (%)</label><input type="number" max="100" min="0" value={probability} onChange={e => setProbability(e.target.value)} className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500" /></div>
                </div>
                <button onClick={handleSaveComm} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 shadow-sm transition-colors mt-2">Save Record</button>
              </div>
            )}

            {lead.communications && lead.communications.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center border-b pb-2"><FileText size={18} className="mr-2"/> Previous Notes & Logs</h3>
                <div className="space-y-4">
                  {lead.communications.map((comm, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{comm.type}</span><span className="text-xs text-slate-500">{new Date(comm.date).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span></div>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{comm.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-1/3 bg-slate-50 p-6 flex flex-col border-t md:border-t-0 md:border-l border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center"><Activity size={18} className="mr-2"/> Activity Timeline</h3>
            <div className="flex-1 overflow-y-auto pr-2 relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              <div className="space-y-6 relative">
                {lead.timeline.map((event, i) => (
                  <div key={i} className="flex items-start pl-10 relative">
                    <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-slate-50 mt-1"></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{event.action}</p>
                      <p className="text-xs text-slate-500">{new Date(event.date).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} • {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [users, setUsers] = useState(() => {
    const savedUsers = window.localStorage.getItem('infusive_crm_team_users');
    return savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
  });
  const [currentUser, setCurrentUser] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [leads, setLeads] = useState(initialLeads);
  const [projects, setProjects] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [notification, setNotification] = useState(null);
  const [lostPrompt, setLostPrompt] = useState(null); 
  const [deletePrompt, setDeletePrompt] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    window.localStorage.setItem('infusive_crm_team_users', JSON.stringify(users));
  }, [users]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = normalizeEmail(loginEmail);
    const password = normalizePassword(loginPassword);

    const matchingTeamUser = users.find(user => user.id !== 'super-admin' && normalizeEmail(user.email) === email);
    const teamUser = matchingTeamUser && normalizePassword(matchingTeamUser.password) === password ? matchingTeamUser : null;

    if (teamUser) {
      setCurrentUser(teamUser);
      setIsLoggedIn(true);
      setLoginError('');
      setCurrentView('dashboard');
      setLoginPassword('');
      return;
    }

    if (matchingTeamUser) {
      setLoginError('Team user found, but password is incorrect. Check the password created in Team Management.');
      return;
    }

    if (!isFirebaseConfigured || !auth || !db) {
      setLoginError('Admin Firebase config missing. Add Firebase web config in .env.');
      return;
    }

    const adminDocRef = getAdminDocRef();
    if (!adminDocRef) {
      setLoginError('Invalid VITE_FIREBASE_ADMIN_DOC_PATH. Use a document path like admin/config.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setLoginError('');

      await signInAnonymously(auth);
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        await signOut(auth);
        setLoginError(`Admin credential doc not found at "${FIREBASE_ADMIN_DOC_PATH}".`);
        return;
      }

      const adminData = adminSnap.data();
      const adminEmail = String(adminData.email || adminData.adminEmail || '').trim().toLowerCase();
      const adminPassword = String(adminData.password || adminData.adminPassword || '');
      const isAdminLogin = adminEmail && adminPassword && email === adminEmail && password === normalizePassword(adminPassword);

      if (!isAdminLogin) {
        await signOut(auth);
        setLoginError('No team user found with this email, and admin credentials did not match.');
        return;
      }

      const adminUser = {
        id: 'super-admin',
        name: adminData.name || 'Super Admin',
        email: adminEmail,
        role: ROLES.ADMIN
      };

      setUsers(prev => prev.some(user => user.id === adminUser.id) ? prev : [...prev, adminUser]);
      setCurrentUser(adminUser);
      setIsLoggedIn(true);
      setLoginError('');
      setCurrentView('dashboard');
      setLoginPassword('');
      return;
    } catch (error) {
      await signOut(auth).catch(() => {});
      setLoginError('Unable to verify admin from Firebase. Check Anonymous Auth, Firestore rules and admin doc.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth).catch(() => {});
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
  };

  const addUser = (userData) => { setUsers(prev => [...prev, { id: generateId(), ...userData }]); showNotification(`${userData.name} account created successfully!`); };
  const removeUser = (userId) => { 
    if (userId === currentUser.id) return showNotification("You cannot delete your own admin account.");
    setUsers(prev => prev.filter(u => u.id !== userId)); showNotification("User account permanently deleted."); 
  };

  const addLead = (leadData) => {
    const newLead = {
      ...leadData, id: generateId(), status: 'NEW LEAD', stage: null, assignedTo: null, addedBy: currentUser.id, expectedValue: 0, probability: 0,
      createdAt: new Date().toISOString(), timeline: [{ date: new Date().toISOString(), action: 'Lead added', user: currentUser.name }], communications: []
    };
    setLeads(prev => [newLead, ...prev]); showNotification('Lead added successfully!'); setCurrentView('dashboard');
  };

  const addBulkLeads = (bulkLeads) => {
    const newLeads = bulkLeads.map(leadData => ({
      ...leadData, id: generateId(), status: 'NEW LEAD', stage: null, assignedTo: null, addedBy: currentUser.id, expectedValue: 0, probability: 0,
      createdAt: new Date().toISOString(), timeline: [{ date: new Date().toISOString(), action: 'Bulk uploaded lead', user: currentUser.name }], communications: []
    }));
    setLeads(prev => [...newLeads, ...prev]); showNotification(`${newLeads.length} leads uploaded successfully!`); setCurrentView('dashboard');
  };

  const updateLeadTLStatus = (leadId, newStatus, assignedTo = null) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        let updatedLead = { ...lead, status: newStatus };
        let actionMsg = `Status changed to ${newStatus}`;
        if (newStatus === 'ASSIGNED' && assignedTo) {
          updatedLead.assignedTo = assignedTo; updatedLead.stage = 'Assigned'; 
          const assignedUser = users.find(u => u.id === assignedTo); actionMsg = `Assigned to ${assignedUser?.name}`;
        }
        updatedLead.timeline = [{ date: new Date().toISOString(), action: actionMsg, user: currentUser.name }, ...updatedLead.timeline];
        if (selectedLead && selectedLead.id === leadId) setSelectedLead(updatedLead);
        return updatedLead;
      }
      return lead;
    }));
  };

  const updateSalesStage = (leadId, newStage, lostReason = '') => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        let updatedLead = { ...lead, stage: newStage };
        let actionMsg = `Moved to ${newStage}`;
        if (newStage === 'Lost') actionMsg += ` (${lostReason})`;
        if (newStage === 'Won') { updatedLead.status = 'WON'; createProject(updatedLead); }
        updatedLead.timeline = [{ date: new Date().toISOString(), action: actionMsg, user: currentUser.name }, ...updatedLead.timeline];
        if (selectedLead && selectedLead.id === leadId) setSelectedLead(updatedLead);
        return updatedLead;
      }
      return lead;
    }));
  };

  const updateLeadDetails = (leadId, updatedFields) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const changedKeys = Object.keys(updatedFields).filter(key => updatedFields[key] !== (lead[key] || ''));
        if (changedKeys.length === 0) return lead; 
        const fieldNames = { companyName: 'Company Name', contactPerson: 'Contact Person', email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp', website: 'Website', country: 'Country' };
        const changesText = changedKeys.map(k => fieldNames[k] || k).join(', ');
        const newTimelineEvent = { date: new Date().toISOString(), action: `Updated lead details: ${changesText}`, user: currentUser.name };
        const updatedLead = { ...lead, ...updatedFields, timeline: [newTimelineEvent, ...lead.timeline] };
        if (selectedLead && selectedLead.id === leadId) setSelectedLead(updatedLead);
        return updatedLead;
      }
      return lead;
    }));
  };

  const addCommunication = (leadId, commData) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const newTimelineEvent = { date: new Date().toISOString(), action: `Logged ${commData.type}: ${commData.notes}`, user: currentUser.name };
        const updatedLead = {
          ...lead, communications: [{ date: new Date().toISOString(), ...commData }, ...lead.communications],
          timeline: [newTimelineEvent, ...lead.timeline], nextFollowUp: commData.nextFollowUp || lead.nextFollowUp,
          expectedValue: commData.expectedValue || lead.expectedValue, probability: commData.probability || lead.probability
        };
        if (selectedLead && selectedLead.id === leadId) setSelectedLead(updatedLead);
        return updatedLead;
      }
      return lead;
    }));
  };

  const deleteLead = (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (selectedLead && selectedLead.id === leadId) setSelectedLead(null);
    showNotification("Lead deleted permanently from database.");
  };

  const createProject = (lead) => {
    const newProject = { id: generateId(), leadId: lead.id, clientName: lead.companyName || lead.contactPerson, service: lead.service, status: 'Onboarding', value: lead.expectedValue, manager: null, createdAt: new Date().toISOString() };
    setProjects(prev => [newProject, ...prev]);
  };

  const exportToCSV = () => {
    const headers = ['Company/Contact Name', 'Contact Person', 'Email', 'Phone', 'Country', 'Service', 'Source', 'Status', 'Pipeline Stage', 'Assigned To BDM'];
    const csvRows = leads.map(l => [l.companyName || l.contactPerson, l.contactPerson, l.email, l.phone, l.country, l.service, l.source, l.status, l.stage || 'Not in Pipeline', l.assignedTo ? users.find(u => u.id === l.assignedTo)?.name : 'Unassigned'].map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Infusive_Leads_Database_${new Date().toLocaleDateString()}.csv`; a.click();
    showNotification("Exporting Master Database to Excel/CSV...");
  };

  const stats = useMemo(() => {
    if (!currentUser) return { totalLeads: 0, newLeads: 0, assigned: 0, won: 0, revenue: 0, myActiveDeals: 0, pipelineValue: 0 };
    const myLeads = leads.filter(l => l.assignedTo === currentUser.id || currentUser.role === ROLES.ADMIN);
    return {
      totalLeads: leads.length, newLeads: leads.filter(l => l.status === 'NEW LEAD').length, assigned: leads.filter(l => l.status === 'ASSIGNED').length, won: leads.filter(l => l.stage === 'Won').length,
      revenue: leads.filter(l => l.stage === 'Won').reduce((sum, l) => sum + Number(l.expectedValue || 0), 0), myActiveDeals: myLeads.filter(l => !['Won', 'Lost', 'Not Interested'].includes(l.stage) && l.stage).length,
      pipelineValue: myLeads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((sum, l) => sum + Number(l.expectedValue || 0), 0),
    };
  }, [leads, currentUser]);

  const neglectedLeads = useMemo(() => {
    if (!currentUser) return [];
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    return leads.filter(l => (l.assignedTo === currentUser.id || currentUser.role === ROLES.ADMIN) && l.stage && !['Won', 'Lost', 'Not Interested'].includes(l.stage) && new Date(l.timeline[0]?.date) < fiveDaysAgo).sort((a, b) => new Date(a.timeline[0]?.date).getTime() - new Date(b.timeline[0]?.date).getTime());
  }, [leads, currentUser]);

  const reminders = useMemo(() => {
    if (!currentUser) return [];
    return leads.filter(l => (l.assignedTo === currentUser.id || currentUser.role === ROLES.ADMIN) && l.nextFollowUp && l.stage && !['Won', 'Lost', 'Not Interested'].includes(l.stage)).sort((a, b) => new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime());
  }, [leads, currentUser]);

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex justify-center mb-6"><div className="bg-blue-600 text-white p-3 rounded-xl"><Target size={32} /></div></div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Digital Infusive CRM</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">Secure employee login portal.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start text-sm border border-red-100"><AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" /><span>{loginError}</span></div>}
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={18} className="text-slate-400" /></div><input required type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500" placeholder="admin@crm.com" /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Password</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div><input required type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500" placeholder="••••••••" /></div></div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-colors flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed">{isLoggingIn ? 'Signing in...' : 'Sign In to Dashboard'}</button>
          </form>
        </div>
      </div>
    );
  }

  const contextValue = { users, currentUser, currentView, setCurrentView, leads, projects, selectedLead, setSelectedLead, isSidebarOpen, handleLogout, addLead, addBulkLeads, updateLeadTLStatus, updateSalesStage, updateLeadDetails, addCommunication, deleteLead, createProject, exportToCSV, stats, neglectedLeads, reminders, addUser, removeUser, showNotification, setLostPrompt, setDeletePrompt };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'add_lead': return <AddLeadView />;
      case 'lead_review': return <LeadReviewView />;
      case 'database': return <LeadDatabaseView />;
      case 'pipeline': return <KanbanBoardView />;
      case 'projects': return <ProjectsView />;
      case 'team': return <TeamManagementView />;
      default: return <DashboardView />;
    }
  };

  return (
    <CRMContext.Provider value={contextValue}>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-30 shrink-0`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
            {isSidebarOpen && (<div className="flex items-center space-x-2"><div className="bg-blue-600 text-white p-1.5 rounded-lg"><Target size={20} /></div><span className="font-bold text-lg tracking-tight text-slate-800">Infusive CRM</span></div>)}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 rounded text-slate-500 mx-auto"><LayoutDashboard size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4"><Navigation /></div>
          <div className="p-4 border-t border-slate-200"><div className="flex items-center justify-center text-xs text-slate-400"><span>v3.0 Firebase Admin Auth</span></div></div>
        </aside>
        
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <TopBar />
          <div className="flex-1 overflow-y-auto p-4 md:p-8">{renderCurrentView()}</div>
        </main>
        
        {selectedLead && <LeadDetailModal />}
        
        {lostPrompt && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Reason for Lost Deal</h3>
              <select id="lostReasonSelect" className="w-full border-slate-300 rounded-lg mb-6 focus:ring-blue-500 text-sm py-2.5">{LOST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setLostPrompt(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={() => { updateSalesStage(lostPrompt, 'Lost', (document.getElementById('lostReasonSelect') as HTMLSelectElement).value); setLostPrompt(null); showNotification("Deal marked as Lost."); }} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm">Mark as Lost</button>
              </div>
            </div>
          </div>
        )}

        {deletePrompt && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 border-red-500">
              <h3 className="font-bold text-lg mb-2 text-slate-800 flex items-center"><AlertTriangle className="text-red-500 mr-2"/> Delete Lead?</h3>
              <p className="text-slate-600 text-sm mb-6">This action is permanent and cannot be undone. Are you sure you want to delete this lead from the database?</p>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setDeletePrompt(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={() => { deleteLead(deletePrompt); setDeletePrompt(null); }} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm">Yes, Delete Lead</button>
              </div>
            </div>
          </div>
        )}

        {notification && (
          <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3.5 rounded-xl shadow-2xl z-[70] animate-in slide-in-from-bottom-8 fade-in duration-300 flex items-center font-medium">
            <CheckCircle size={18} className="mr-2 text-emerald-400" />{notification}
          </div>
        )}
      </div>
    </CRMContext.Provider>
  );
}

