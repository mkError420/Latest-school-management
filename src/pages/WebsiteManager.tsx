import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Image as ImageIcon, 
  Megaphone, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Layout,
  Users,
  Shield,
  Download,
  Link as LinkIcon,
  Info,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/src/lib/auth';
import { toast } from 'sonner';
import { storage } from '@/src/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Types
interface Notice { id: string; title: string; content: string; date: string; attachmentUrl?: string; attachmentName?: string; createdAt: any; }
interface GalleryItem { id: string; url: string; title: string; category: string; createdAt: any; }
interface CommitteeMember { id: string; name: string; title: string; order: number; }
interface DownloadItem { id: string; name: string; url: string; size: string; category: string; }
interface ImportantLink { id: string; name: string; url: string; order: number; }
interface PublicStaff { id: string; name: string; role: string; imageUrl: string; category: string; order: number; }

export default function WebsiteManager() {
  const navigate = useNavigate();
  const { systemConfig } = useAuth();
  const [activeTab, setActiveTab] = useState('notices');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [committee, setCommittee] = useState<CommitteeMember[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [publicStaff, setPublicStaff] = useState<PublicStaff[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
  const [noticeFile, setNoticeFile] = useState<File | null>(null);
  const [galleryForm, setGalleryForm] = useState({ url: '', title: '', category: 'campus' });
  const [configForm, setConfigForm] = useState({
    schoolName: '',
    phone: '',
    email: '',
    address: '',
    principalName: '',
    principalMessage: '',
    principalImageUrl: '',
    mission: '',
    vision: '',
    history: '',
    schoolLogoUrl: ''
  });
  const [staffForm, setStaffForm] = useState({ name: '', role: '', imageUrl: '', category: 'administration', order: 0 });
  const [committeeForm, setCommitteeForm] = useState({ name: '', title: '', order: 0 });
  const [downloadForm, setDownloadForm] = useState({ name: '', url: '', size: '', category: 'academic' });
  const [linkForm, setLinkForm] = useState({ name: '', url: '', order: 0 });

  const fetchData = async () => {
    try {
      const [n, g, c, d, l, s, conf] = await Promise.all([
        fetch('/api/website/notices').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/website/gallery').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/website/committee').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/website/downloads').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/website/important_links').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/website/public_staff').then(async r => { const val = await r.json(); return Array.isArray(val) ? val.map((x: any) => ({ ...x, id: x._id })) : []; }),
        fetch('/api/config/system').then(async r => { const val = await r.json(); return val.error ? null : val; })
      ]);
      setNotices(n);
      setGallery(g);
      setCommittee(c);
      setDownloads(d);
      setLinks(l);
      setPublicStaff(s);
      if (conf) setConfigForm(conf);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load website content');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (noticeFile) {
        attachmentName = noticeFile.name;
        try {
          const fileRef = ref(storage, `notices/${Date.now()}-${noticeFile.name}`);
          await uploadBytes(fileRef, noticeFile);
          attachmentUrl = await getDownloadURL(fileRef);
        } catch (storageError) {
          console.warn('Storage upload failed, falling back to Base64:', storageError);
          const reader = new FileReader();
          attachmentUrl = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(noticeFile);
          });
        }
      }

      const payload = {
        ...noticeForm,
        attachmentUrl,
        attachmentName
      };

      const res = await fetch('/api/website/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      toast.success('Notice published successfully');
      setNoticeForm({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
      setNoticeFile(null);
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to publish notice: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(galleryForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Photo added to gallery');
      setGalleryForm({ url: '', title: '', category: 'campus' });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add photo: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/config/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Site configuration updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update config: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/public_staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Staff added to website');
      setStaffForm({ name: '', role: '', imageUrl: '', category: 'administration', order: 0 });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add staff: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/committee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(committeeForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Member added to committee');
      setCommitteeForm({ name: '', title: '', order: 0 });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add member: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Resource added to downloads');
      setDownloadForm({ name: '', url: '', size: '', category: 'academic' });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add resource: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/website/important_links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm)
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Link added to sidebar');
      setLinkForm({ name: '', url: '', order: 0 });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add link: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/website/${coll}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-sidebar p-8 rounded-[32px] border border-sidebar-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
             <Globe className="w-6 h-6 text-primary" /> School Website Manager
          </h1>
          <p className="text-xs text-sidebar-foreground uppercase font-bold tracking-widest opacity-60">Control your public-facing frontend content</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-sidebar-foreground hover:text-white text-xs uppercase font-bold tracking-widest h-11 px-6 rounded-xl hover:bg-white/5 border border-transparent hover:border-sidebar-border transition-all"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button variant="outline" className="bg-white/5 border-sidebar-border text-xs uppercase font-bold tracking-widest text-white h-11">
            <a href="/" target="_blank" className="flex items-center"><ExternalLink className="w-4 h-4 mr-2" /> View Website</a>
          </Button>
          <Button onClick={() => setIsAdding(!isAdding)} className="h-11 rounded-xl px-6 font-bold uppercase tracking-widest text-[11px]">
            {isAdding ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> New Content</>}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-sidebar border border-sidebar-border p-1 h-14 rounded-2xl overflow-x-auto">
          <TabsTrigger value="notices" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white h-full shrink-0">
            <Megaphone className="w-3.5 h-3.5 mr-2" /> News
          </TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white h-full shrink-0">
            <ImageIcon className="w-3.5 h-3.5 mr-2" /> Gallery
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white h-full shrink-0">
            <Users className="w-3.5 h-3.5 mr-2" /> Staff & Leadership
          </TabsTrigger>
          <TabsTrigger value="downloads" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white h-full shrink-0">
            <Download className="w-3.5 h-3.5 mr-2" /> Downloads
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl px-6 font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-white h-full shrink-0">
            <Layout className="w-3.5 h-3.5 mr-2" /> Site Config
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <TabsContent value="notices" className="mt-0 space-y-6">
              {isAdding && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-sidebar p-8 rounded-[32px] border border-primary/20 shadow-2xl shadow-primary/5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Create New Notice</h3>
                  <form onSubmit={handleAddNotice} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Title</label>
                        <Input value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} placeholder="Exam Schedule Released" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Expiry/Display Date</label>
                        <Input type="date" value={noticeForm.date} onChange={e => setNoticeForm({...noticeForm, date: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Attachment (Image/PDF) - Optional</label>
                      <Input type="file" accept="image/*,application/pdf" onChange={e => setNoticeFile(e.target.files?.[0] || null)} className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium flex items-center justify-center file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-primary/20 file:text-primary hover:file:bg-primary/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Content</label>
                      <Textarea value={noticeForm.content} onChange={e => setNoticeForm({...noticeForm, content: e.target.value})} placeholder="Enter the detailed announcement..." className="bg-sidebar-accent/50 border-sidebar-border rounded-xl text-white font-medium min-h-[150px]" required />
                    </div>
                    <Button disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20">
                      {isLoading ? 'Publishing...' : 'Publish to Website'}
                    </Button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {notices.map(notice => (
                  <div key={notice.id} className="bg-sidebar p-6 rounded-3xl border border-sidebar-border flex justify-between items-start group">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">{notice.date}</span>
                        <h4 className="text-white font-bold tracking-tight">{notice.title}</h4>
                      </div>
                      <p className="text-xs text-sidebar-foreground line-clamp-1 opacity-60">{notice.content}</p>
                      {notice.attachmentUrl && (
                        <a href={notice.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300">
                          <ExternalLink className="w-3 h-3" /> View Attachment {notice.attachmentName ? `(${notice.attachmentName})` : ''}
                        </a>
                      )}
                    </div>
                    <Button onClick={() => handleDelete('notices', notice.id)} variant="ghost" className="text-sidebar-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="mt-0 space-y-6">
              {isAdding && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-sidebar p-8 rounded-[32px] border border-primary/20 shadow-2xl shadow-primary/5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Add Photo to Gallery</h3>
                  <form onSubmit={handleAddGallery} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Image URL</label>
                        <Input value={galleryForm.url} onChange={e => setGalleryForm({...galleryForm, url: e.target.value})} placeholder="https://images.unsplash.com/..." className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Category</label>
                        <select 
                          value={galleryForm.category} 
                          onChange={e => setGalleryForm({...galleryForm, category: e.target.value})}
                          className="w-full bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium px-4 text-sm"
                        >
                          <option value="campus">Campus</option>
                          <option value="events">Events</option>
                          <option value="academic">Academic</option>
                          <option value="sports">Sports</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-sidebar-foreground tracking-widest ml-1">Caption / Title</label>
                      <Input value={galleryForm.title} onChange={e => setGalleryForm({...galleryForm, title: e.target.value})} placeholder="Annual Sports Day 2024" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white font-medium" required />
                    </div>
                    <Button disabled={isLoading} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20">
                      {isLoading ? 'Adding...' : 'Save to Gallery'}
                    </Button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {gallery.map(item => (
                  <div key={item.id} className="relative aspect-video rounded-3xl overflow-hidden border border-sidebar-border group">
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold text-xs uppercase tracking-widest">{item.title}</p>
                      <p className="text-primary font-bold text-[9px] uppercase tracking-widest mt-1">{item.category}</p>
                    </div>
                    <button 
                      onClick={() => handleDelete('gallery', item.id)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="staff" className="mt-0 space-y-8">
               {isAdding && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-sidebar p-8 rounded-[32px] border border-primary/20">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Add Public Staff</h3>
                      <form onSubmit={handleAddStaff} className="space-y-4">
                         <Input value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} placeholder="Staff Name" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} placeholder="Role (e.g. Principal)" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input value={staffForm.imageUrl} onChange={e => setStaffForm({...staffForm, imageUrl: e.target.value})} placeholder="Image URL" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" />
                         <select 
                            value={staffForm.category} 
                            onChange={e => setStaffForm({...staffForm, category: e.target.value})}
                            className="w-full bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white px-4"
                         >
                           <option value="administration">Administration</option>
                           <option value="teacher">Teacher</option>
                           <option value="other">Other</option>
                         </select>
                         <Input type="number" value={staffForm.order} onChange={e => setStaffForm({...staffForm, order: parseInt(e.target.value) || 0})} placeholder="Display Order" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" />
                         <Button disabled={isLoading} className="w-full h-12 bg-primary">Save Staff Member</Button>
                      </form>
                   </motion.div>
                   <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-sidebar p-8 rounded-[32px] border border-secondary/20">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Add Committee Member</h3>
                      <form onSubmit={handleAddCommittee} className="space-y-4">
                         <Input value={committeeForm.name} onChange={e => setCommitteeForm({...committeeForm, name: e.target.value})} placeholder="Member Name" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input value={committeeForm.title} onChange={e => setCommitteeForm({...committeeForm, title: e.target.value})} placeholder="Title (e.g. Chairman)" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input type="number" value={committeeForm.order} onChange={e => setCommitteeForm({...committeeForm, order: parseInt(e.target.value) || 0})} placeholder="Display Order" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" />
                         <Button disabled={isLoading} className="w-full h-12 bg-secondary text-white">Save Committee Member</Button>
                      </form>
                   </motion.div>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Website Staff List</h4>
                    {publicStaff.map(member => (
                      <div key={member.id} className="bg-sidebar-accent/20 p-4 rounded-xl border border-sidebar-border flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-sidebar-accent overflow-hidden">
                              <img src={member.imageUrl || 'https://via.placeholder.com/40'} alt="" className="w-full h-full object-cover" />
                           </div>
                           <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight">{member.name}</p>
                              <p className="text-[10px] text-primary uppercase font-bold">{member.role}</p>
                           </div>
                        </div>
                        <Button onClick={() => handleDelete('public_staff', member.id)} variant="ghost" className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Committee Members</h4>
                    {committee.map(member => (
                      <div key={member.id} className="bg-sidebar-accent/20 p-4 rounded-xl border border-sidebar-border flex justify-between items-center group">
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-tight">{member.name}</p>
                          <p className="text-[10px] text-secondary uppercase font-bold">{member.title}</p>
                        </div>
                        <Button onClick={() => handleDelete('committee', member.id)} variant="ghost" className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="downloads" className="mt-0 space-y-8">
               {isAdding && (
                 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-sidebar p-8 rounded-[32px] border border-primary/20">
                   <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Add New Resource / Link</h3>
                   <form onSubmit={handleAddDownload} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Input value={downloadForm.name} onChange={e => setDownloadForm({...downloadForm, name: e.target.value})} placeholder="File Name (e.g. Syllabus 2024)" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input value={downloadForm.url} onChange={e => setDownloadForm({...downloadForm, url: e.target.value})} placeholder="File/Page URL" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" required />
                         <Input value={downloadForm.size} onChange={e => setDownloadForm({...downloadForm, size: e.target.value})} placeholder="File Size (e.g. 1.5MB)" className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white" />
                         <select 
                            value={downloadForm.category} 
                            onChange={e => setDownloadForm({...downloadForm, category: e.target.value})}
                            className="bg-sidebar-accent/50 border-sidebar-border h-12 rounded-xl text-white px-4"
                         >
                           <option value="academic">Academic</option>
                           <option value="admission">Admission</option>
                           <option value="routine">Routine</option>
                           <option value="syllabus">Syllabus</option>
                           <option value="other">Other</option>
                         </select>
                      </div>
                      <Button className="w-full h-12 bg-primary font-black uppercase tracking-widest">Publish Resource</Button>
                   </form>
                 </motion.div>
               )}

               <div className="space-y-4">
                  {downloads.map(doc => (
                    <div key={doc.id} className="bg-sidebar p-4 rounded-xl border border-sidebar-border flex justify-between items-center group">
                       <div className="flex items-center gap-3">
                          <Download className="w-5 h-5 text-emerald-400" />
                          <div>
                             <p className="text-xs font-bold text-white uppercase tracking-tight">{doc.name}</p>
                             <p className="text-[10px] text-sidebar-foreground uppercase font-bold opacity-60">{doc.category} • {doc.size}</p>
                          </div>
                       </div>
                       <Button onClick={() => handleDelete('downloads', doc.id)} variant="ghost" className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  ))}
               </div>
            </TabsContent>

            <TabsContent value="config" className="mt-0">
               <form onSubmit={handleUpdateConfig} className="bg-sidebar p-8 rounded-[32px] border border-sidebar-border space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-sidebar-border pb-2">Institution Identity</h4>
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">School/College Name</label>
                              <Input value={configForm.schoolName} onChange={e => setConfigForm({...configForm, schoolName: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" placeholder="Govt. Model School & College" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">School Logo URL</label>
                              <Input value={configForm.schoolLogoUrl} onChange={e => setConfigForm({...configForm, schoolLogoUrl: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" placeholder="https://..." />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Contact Phone</label>
                                 <Input value={configForm.phone} onChange={e => setConfigForm({...configForm, phone: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" placeholder="+880..." />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Official Email</label>
                                 <Input value={configForm.email} onChange={e => setConfigForm({...configForm, email: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" placeholder="info@..." />
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Physical Address</label>
                              <Input value={configForm.address} onChange={e => setConfigForm({...configForm, address: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" placeholder="Sector-A, Educational Zone, Dhaka" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Principal Name</label>
                              <Input value={configForm.principalName} onChange={e => setConfigForm({...configForm, principalName: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Principal Image URL</label>
                              <Input value={configForm.principalImageUrl} onChange={e => setConfigForm({...configForm, principalImageUrl: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border h-12" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Principal's Speech</label>
                              <Textarea value={configForm.principalMessage} onChange={e => setConfigForm({...configForm, principalMessage: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border min-h-[120px]" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-sidebar-border pb-2">Institutional Statements</h4>
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Our Mission</label>
                              <Textarea value={configForm.mission} onChange={e => setConfigForm({...configForm, mission: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Our Vision</label>
                              <Textarea value={configForm.vision} onChange={e => setConfigForm({...configForm, vision: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-sidebar-foreground tracking-widest ml-1">Brief History</label>
                              <Textarea value={configForm.history} onChange={e => setConfigForm({...configForm, history: e.target.value})} className="bg-sidebar-accent/50 border-sidebar-border min-h-[120px]" />
                           </div>
                        </div>
                     </div>
                  </div>
                  <Button disabled={isLoading} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" /> {isLoading ? 'Saving Changes...' : 'Save Site Configuration'}
                  </Button>
               </form>
            </TabsContent>
          </div>

          {/* Quick Stats / Sidebar */}
          <div className="space-y-6">
            <div className="bg-sidebar p-8 rounded-[32px] border border-sidebar-border space-y-6">
               <h3 className="text-xs font-bold text-white uppercase tracking-widest">Sidebar Links</h3>
               <p className="text-[10px] text-sidebar-foreground font-medium italic opacity-60">Manage quick links displayed across the site</p>
               
               <AnimatePresence>
                 {isAdding && (
                   <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <form onSubmit={handleAddLink} className="space-y-3 bg-sidebar-accent/30 p-4 rounded-xl border border-sidebar-border">
                         <Input value={linkForm.name} onChange={e => setLinkForm({...linkForm, name: e.target.value})} placeholder="Link Text" className="bg-sidebar h-9 text-[11px]" required />
                         <Input value={linkForm.url} onChange={e => setLinkForm({...linkForm, url: e.target.value})} placeholder="URL" className="bg-sidebar h-9 text-[11px]" required />
                         <Input type="number" value={linkForm.order} onChange={e => setLinkForm({...linkForm, order: parseInt(e.target.value) || 0})} placeholder="Order" className="bg-sidebar h-9 text-[11px]" />
                         <Button className="w-full h-9 text-[10px] bg-emerald-600 font-bold uppercase tracking-widest">Add Link</Button>
                      </form>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="space-y-2">
                  {links.map(link => (
                    <div key={link.id} className="flex justify-between items-center p-3 rounded-xl bg-sidebar-accent/10 border border-sidebar-border/50 group">
                       <div className="flex items-center gap-2 overflow-hidden">
                          <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{link.name}</span>
                       </div>
                       <button onClick={() => handleDelete('important_links', link.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-sidebar p-8 rounded-[32px] border border-sidebar-border space-y-6">
               <h3 className="text-xs font-bold text-white uppercase tracking-widest">Website Health</h3>
               
               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-sidebar-accent/30 p-5 rounded-2xl border border-sidebar-border/50">
                    <div className="flex justify-between items-center mb-2">
                       <Megaphone className="w-4 h-4 text-primary" />
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{notices.length}</p>
                    <p className="text-[9px] font-bold text-sidebar-foreground uppercase tracking-widest mt-1">Live Notices</p>
                  </div>

                  <div className="bg-sidebar-accent/30 p-5 rounded-2xl border border-sidebar-border/50">
                    <div className="flex justify-between items-center mb-2">
                       <ImageIcon className="w-4 h-4 text-secondary" />
                       <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 px-2 py-0.5 rounded">Media</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{gallery.length}</p>
                    <p className="text-[9px] font-bold text-sidebar-foreground uppercase tracking-widest mt-1">Gallery Items</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
