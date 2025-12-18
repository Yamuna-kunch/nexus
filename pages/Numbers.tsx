
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { PhoneNumber, TwilioCredential, TwilioPhoneNumber } from '../types';
import { TwilioService } from '../services/twilioService';
import { StorageService } from '../services/storageService';
import { 
  Phone, 
  Search, 
  ShoppingCart, 
  Globe, 
  MessageSquare, 
  Loader2, 
  LogOut, 
  ShieldCheck,
  AlertCircle,
  Settings
} from 'lucide-react';

const Numbers: React.FC = () => {
  // Connection State
  const [credentials, setCredentials] = useState<TwilioCredential | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);

  // Form State
  const [sidInput, setSidInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  // Main UI State
  const [activeTab, setActiveTab] = useState<'my-numbers' | 'buy'>('my-numbers');
  const [myNumbers, setMyNumbers] = useState<PhoneNumber[]>([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);

  // Search/Buy State
  const [searchCountry, setSearchCountry] = useState('US');
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchResults, setSearchResults] = useState<TwilioPhoneNumber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  // Initial Load (Credentials)
  useEffect(() => {
    const storedCreds = StorageService.getTwilioCreds();
    if (storedCreds) {
      setCredentials({ accountSid: storedCreds.accountSid, authToken: storedCreds.authToken });
      setIsDemoMode(storedCreds.isDemo);
      setIsConnected(true);
      setSidInput(storedCreds.accountSid);
      setTokenInput(storedCreds.authToken);
      setBalance(storedCreds.isDemo ? '$50.00 (Demo)' : 'Loading...');
      if(!storedCreds.isDemo) {
          // In real app, fetch balance here
          setBalance('Active');
      }
    }
  }, []);

  // Load numbers when connected or tab changes
  useEffect(() => {
    if (isConnected && credentials && activeTab === 'my-numbers') {
      loadMyNumbers();
    }
  }, [isConnected, credentials, activeTab]);

  const loadMyNumbers = async () => {
    setIsLoadingNumbers(true);
    try {
      // 1. Fetch from API (Mock or Real)
      const data = await TwilioService.getIncomingNumbers(credentials!, isDemoMode);
      
      const mappedFromApi: PhoneNumber[] = data.incoming_phone_numbers.map((n: any) => ({
        id: n.sid,
        number: n.phone_number,
        friendlyName: n.friendly_name,
        country: n.iso_country || 'US',
        capabilities: Object.keys(n.capabilities).filter(k => n.capabilities[k]).map(k => k.toLowerCase()) as any,
        status: 'active',
      }));

      // 2. Get existing local storage to preserve assignments
      const storedNumbers = StorageService.getPhoneNumbers();
      
      // 3. Merge: Take API numbers as source of truth, attach local assignments
      const merged: PhoneNumber[] = mappedFromApi.map(apiNum => {
          const localNum = storedNumbers.find(s => s.id === apiNum.id);
          return {
              ...apiNum,
              assignedAgentId: localNum?.assignedAgentId // Preserve assignment
          };
      });

      // 4. Update storage strictly (Remove dummy/seed numbers that are not in API response)
      StorageService.replacePhoneNumbers(merged);
      
      // 5. Update UI
      setMyNumbers(merged);
      
    } catch (err) {
      console.error(err);
      // Fallback: If API fails completely, just show what we have locally
      setMyNumbers(StorageService.getPhoneNumbers());
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectError('');

    const creds = { accountSid: sidInput, authToken: tokenInput };
    if (isDemoMode && (!sidInput || !tokenInput)) {
        creds.accountSid = 'AC_DEMO_ACCOUNT_SID_12345';
        creds.authToken = 'AUTH_TOKEN_DEMO';
    }

    try {
      await TwilioService.validate(creds, isDemoMode);
      
      setCredentials(creds);
      setIsConnected(true);
      setBalance(isDemoMode ? '$50.00 (Demo)' : 'Active');
      
      // Persist credentials
      StorageService.saveTwilioCreds({ ...creds, isDemo: isDemoMode });

    } catch (err) {
      setConnectError('Could not connect. Check credentials or enable Demo Mode.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setCredentials(null);
    setMyNumbers([]);
    setSearchResults([]);
    setSidInput('');
    setTokenInput('');
    StorageService.removeTwilioCreds();
  };

  const handleSearch = async () => {
    if (!credentials) return;
    setIsSearching(true);
    try {
      const res = await TwilioService.searchAvailableNumbers(credentials, searchCountry, searchAreaCode, isDemoMode);
      
      const mappedResults: TwilioPhoneNumber[] = res.available_phone_numbers.map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        lata: n.lata,
        locality: n.locality,
        region: n.region,
        postalCode: n.postal_code,
        isoCountry: n.iso_country,
        capabilities: n.capabilities
      }));

      setSearchResults(mappedResults);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuy = async (phoneNumber: string) => {
    if (!credentials) return;
    setBuyingNumber(phoneNumber);
    try {
      const bought = await TwilioService.buyNumber(credentials, phoneNumber, isDemoMode);
      
      // Save the new number to storage (append it, because we just bought it)
      const newPhone: PhoneNumber = {
          id: bought.sid,
          number: bought.phone_number,
          friendlyName: bought.friendly_name,
          country: bought.iso_country,
          capabilities: Object.keys(bought.capabilities).filter(k => bought.capabilities[k]).map(k => k.toLowerCase()) as any,
          status: 'active'
      };
      
      StorageService.savePhoneNumber(newPhone);
      
      setActiveTab('my-numbers');
      // Tab change logic will trigger loadMyNumbers via useEffect, re-syncing everything
      
    } catch (err) {
      alert("Failed to purchase number.");
    } finally {
      setBuyingNumber(null);
    }
  };

  const handleAssignChange = (numberId: string, agentId: string) => {
      if (agentId) {
          StorageService.assignNumberToAgent(numberId, agentId);
      } else {
          StorageService.unassignNumber(numberId);
      }
      // Update local view
      setMyNumbers(StorageService.getPhoneNumbers());
  };

  const agents = StorageService.getAgents(); // For dropdown

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Connect Twilio</h1>
            <p className="text-slate-500 mt-2">Enter your API credentials to manage phone numbers.</p>
        </div>
        
        <Card className="p-8">
            <form onSubmit={handleConnect} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account SID</label>
                    <input 
                        type="text" 
                        value={sidInput}
                        onChange={e => setSidInput(e.target.value)}
                        placeholder="AC..."
                        className="w-full border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 py-2.5 px-3"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Auth Token</label>
                    <input 
                        type="password" 
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 py-2.5 px-3"
                    />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3 border border-slate-100">
                    <div className="pt-0.5">
                       <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-slate-900">Demo Mode</h4>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={isDemoMode} onChange={e => setIsDemoMode(e.target.checked)} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        <p className="text-xs text-slate-500">
                            Enables a fully functional simulation without real charges.
                        </p>
                    </div>
                </div>

                {connectError && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {connectError}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isConnecting}
                    className="w-full flex justify-center items-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
                >
                    {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect Account'}
                </button>
            </form>
            <div className="mt-6 text-center">
                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    Get credentials from Twilio Console &rarr;
                </a>
            </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500">
             <span className="flex items-center gap-1 text-emerald-600 font-medium">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 Connected
             </span>
             <span>•</span>
             <span className="font-mono">{credentials?.accountSid}</span>
             <span>•</span>
             <span>Balance: {balance}</span>
          </div>
        </div>
        <div className="flex gap-3">
             <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setActiveTab('my-numbers')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'my-numbers' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    My Numbers
                </button>
                <button 
                    onClick={() => setActiveTab('buy')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'buy' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Buy Numbers
                </button>
            </div>
            <button 
                onClick={handleDisconnect}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                title="Disconnect Account"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </div>

      {activeTab === 'my-numbers' ? (
        <Card className="min-h-[400px]">
          {isLoadingNumbers ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Fetching inventory...</p>
             </div>
          ) : myNumbers.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Phone className="w-12 h-12 mb-3 opacity-20" />
                <p className="mb-4">No numbers found.</p>
                <button onClick={() => setActiveTab('buy')} className="text-indigo-600 font-medium hover:underline">Purchase your first number</button>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Capabilities</th>
                    <th className="px-6 py-4">Assigned Agent</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myNumbers.map((num) => (
                    <tr key={num.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{num.friendlyName || num.number}</p>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <span>{num.country === 'US' ? '🇺🇸 United States' : `🇬🇧 ${num.country}`}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {num.capabilities.includes('voice') && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium border border-blue-100">
                                  <Phone className="w-3 h-3" /> Voice
                              </span>
                          )}
                          {num.capabilities.includes('sms') && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded font-medium border border-green-100">
                                  <MessageSquare className="w-3 h-3" /> SMS
                              </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                            value={num.assignedAgentId || ''}
                            onChange={(e) => handleAssignChange(num.id, e.target.value)}
                            className="text-sm border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-1.5 pl-2 pr-8 bg-slate-50/50 max-w-[200px]"
                        >
                            <option value="">-- Unassigned --</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
           {/* Search Filters */}
           <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-xl">
             <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 w-full">
                 <label className="block text-sm font-medium text-slate-300 mb-1">Country</label>
                 <select 
                    value={searchCountry}
                    onChange={e => setSearchCountry(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 py-2.5 px-3"
                 >
                   <option value="US">United States (+1)</option>
                   <option value="GB">United Kingdom (+44)</option>
                   <option value="CA">Canada (+1)</option>
                 </select>
               </div>
               <div className="flex-1 w-full">
                 <label className="block text-sm font-medium text-slate-300 mb-1">Area Code / Pattern</label>
                 <div className="relative">
                   <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                   <input 
                    type="text" 
                    value={searchAreaCode}
                    onChange={e => setSearchAreaCode(e.target.value)}
                    placeholder="e.g. 415" 
                    className="w-full bg-slate-800 border-slate-700 text-white pl-9 rounded-lg focus:ring-2 focus:ring-indigo-500 py-2.5 px-3 placeholder-slate-500"
                   />
                 </div>
               </div>
               <div className="w-full md:w-auto">
                 <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50"
                 >
                   {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Numbers'}
                 </button>
               </div>
             </div>
           </Card>

           {/* Results Grid */}
           {searchResults.length > 0 && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {searchResults.map((num) => (
                    <div key={num.phoneNumber} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col justify-between h-full">
                       <div>
                         <div className="flex justify-between items-start mb-3">
                           <h3 className="text-xl font-bold text-slate-900 tracking-tight">{num.friendlyName}</h3>
                           <div className="flex flex-col items-end">
                               <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">{num.locality || num.region || num.isoCountry}</span>
                           </div>
                         </div>
                         <div className="flex gap-2 mb-6">
                            <div className={`p-1.5 rounded-md ${num.capabilities.voice ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className={`p-1.5 rounded-md ${num.capabilities.SMS ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}>
                                <MessageSquare className="w-4 h-4" />
                            </div>
                         </div>
                       </div>
                       <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                         <div>
                            <span className="block text-xs text-slate-500">Monthly</span>
                            <span className="font-bold text-slate-900 text-lg">$1.15</span>
                         </div>
                         <button 
                            onClick={() => handleBuy(num.phoneNumber)}
                            disabled={buyingNumber === num.phoneNumber}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                           {buyingNumber === num.phoneNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> Buy</>}
                         </button>
                       </div>
                    </div>
                  ))}
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default Numbers;
