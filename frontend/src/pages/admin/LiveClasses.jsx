import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function localIso(d = new Date()) {
  const off = d.getTimezoneOffset();
  const localTime = new Date(d.getTime() - off * 60000);
  return localTime.toISOString().slice(0, 16); // for datetime-local input
}

const empty = { title: "", batch_id: "", subject_id: "", youtube_url: "", start_time: localIso(), description: "" };

export default function AdminLiveClasses() {
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [delId, setDelId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [{ data: lc }, { data: b }, { data: s }] = await Promise.all([api.get("/live-classes"), api.get("/batches"), api.get("/subjects")]);
    setItems(lc); setBatches(b); setSubjects(s); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const batchSubjects = useMemo(() => subjects.filter(s => s.batch_id === form.batch_id), [subjects, form.batch_id]);
  const batchName = (id) => batches.find(b => b.id === id)?.name || "—";

  const save = async () => {
    if (!form.title || !form.batch_id || !form.youtube_url) { toast.error("Title, batch and URL required"); return; }
    const payload = {
      ...form,
      subject_id: form.subject_id || null,
      start_time: new Date(form.start_time).toISOString(),
    };
    try {
      if (editId) await api.put(`/live-classes/${editId}`, payload);
      else await api.post(`/live-classes`, payload);
      toast.success("Saved"); setOpen(false); load();
    } catch { toast.error("Save failed"); }
  };
  const remove = async () => { try { await api.delete(`/live-classes/${delId}`); toast.success("Deleted"); setDelId(null); load(); } catch { toast.error("Delete failed"); } };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#1D4ED8]">Admin</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter text-slate-900 mt-1">Live Classes</h1>
          <p className="text-slate-500 mt-2 text-sm">Paste your YouTube Live URL after starting the stream.</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(empty); setOpen(true); }} className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-md" data-testid="new-live-btn">
          <Plus className="h-4 w-4 mr-2" /> Publish Live
        </Button>
      </div>

      {loading ? <Skeleton className="h-64 w-full rounded-lg" /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
              <tr><th className="text-left p-4">Title</th><th className="text-left p-4">Batch</th><th className="text-left p-4 hidden sm:table-cell">Start</th><th className="text-left p-4">Status</th><th className="text-right p-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(lc => (
                <tr key={lc.id} data-testid={`live-row-${lc.id}`}>
                  <td className="p-4 font-medium text-slate-900">{lc.title}</td>
                  <td className="p-4 text-slate-600">{batchName(lc.batch_id)}</td>
                  <td className="p-4 hidden sm:table-cell text-slate-500">{new Date(lc.start_time).toLocaleString()}</td>
                  <td className="p-4">
                    {lc.status === "live" ? (
                      <Badge className="bg-[#F97316] hover:bg-[#F97316] text-white rounded-md"><Radio className="h-3 w-3 mr-1" />LIVE</Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-md">{lc.status}</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(lc.id); setForm({ ...empty, ...lc, start_time: localIso(new Date(lc.start_time)) }); setOpen(true); }} data-testid={`edit-live-${lc.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDelId(lc.id)} className="text-red-600" data-testid={`delete-live-${lc.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No live classes.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Live Class" : "Publish Live Class"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="live-title-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Batch</Label>
                <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v, subject_id: "" })}>
                  <SelectTrigger data-testid="live-batch-select"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject (optional)</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })} disabled={!form.batch_id}>
                  <SelectTrigger data-testid="live-subject-select"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{batchSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>YouTube Live URL</Label><Input value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." data-testid="live-url-input" /></div>
            <div><Label>Start time</Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} data-testid="live-start-input" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="live-description-input" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" data-testid="save-live-btn">Publish</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete live class?</AlertDialogTitle><AlertDialogDescription>This is permanent.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
