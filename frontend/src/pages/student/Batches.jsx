import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import BatchCard from "@/components/BatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function StudentBatches() {
  const [enrolled, setEnrolled] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: my }, { data: every }] = await Promise.all([
      api.get("/enrollments/me"),
      api.get("/batches"),
    ]);
    setEnrolled(my);
    setAll(every);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enroll = async (batch_id) => {
    try {
      await api.post(`/enrollments/self/${batch_id}`);
      toast.success("Enrolled successfully");
      await load();
    } catch (e) {
      toast.error("Could not enroll");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Library</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter text-slate-900 mt-1">My Batches</h1>
        <p className="text-slate-500 mt-2">Manage your enrolled batches and browse available ones.</p>
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList className="bg-white border border-slate-200 rounded-md p-1">
          <TabsTrigger value="enrolled" data-testid="tab-enrolled">Enrolled ({enrolled.length})</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-batches">All Batches</TabsTrigger>
        </TabsList>
        <TabsContent value="enrolled" className="mt-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
            </div>
          ) : enrolled.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-500">
              You're not enrolled yet. Switch to "All Batches" to join.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="enrolled-batches-grid">
              {enrolled.map((b) => <BatchCard key={b.id} batch={b} testid="enrolled-batch" />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="all-batches-grid">
            {all.map((b) => {
              const isEnrolled = enrolled.some((e) => e.id === b.id);
              return (
                <div key={b.id} className="space-y-2">
                  <BatchCard batch={b} testid="all-batch" />
                  {!isEnrolled && (
                    <Button
                      onClick={() => enroll(b.id)}
                      className="w-full bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white rounded-md"
                      data-testid={`enroll-btn-${b.id}`}
                    >
                      Enroll Now
                    </Button>
                  )}
                  {isEnrolled && (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md py-2 text-center font-medium">
                      ✓ Enrolled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
