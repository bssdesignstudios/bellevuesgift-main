import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Printer,
  ShoppingCart,
  Warehouse,
  Shield,
  DollarSign,
  UserCog,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SOP_DATA, SOPSection, SOPStep } from '@/data/sopData';

const ROLE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'cashier', label: 'Cashier' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'admin', label: 'Admin' },
  { key: 'finance', label: 'Finance' },
  { key: 'manager', label: 'Manager' },
] as const;

const ROLE_COLORS: Record<string, string> = {
  cashier: 'bg-blue-100 text-blue-800',
  warehouse: 'bg-amber-100 text-amber-800',
  admin: 'bg-purple-100 text-purple-800',
  finance: 'bg-green-100 text-green-800',
  manager: 'bg-rose-100 text-rose-800',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Warehouse,
  Shield,
  DollarSign,
  UserCog,
};

function SectionIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || BookOpen;
  return <Icon className={className} />;
}

// Step numbering that separates What/When metadata from actionable steps
function ProcedureCardNumbered({
  procedure,
  defaultOpen,
}: {
  procedure: SOPStep;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Split steps into metadata (What/When) and actionable steps
  const metadata = procedure.steps.filter(
    (s) => s.startsWith('What:') || s.startsWith('When:')
  );
  const actionSteps = procedure.steps.filter(
    (s) => !s.startsWith('What:') && !s.startsWith('When:')
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{procedure.title}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {actionSteps.length} steps
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/20">
          {metadata.length > 0 && (
            <div className="mb-3 space-y-1">
              {metadata.map((m, i) => (
                <p key={i} className="text-sm text-muted-foreground italic">
                  {m}
                </p>
              ))}
            </div>
          )}
          <ol className="space-y-2">
            {actionSteps.map((step, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="font-semibold text-muted-foreground shrink-0 w-5 text-right">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AdminSOP() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Read URL params for pre-filtering (used by SOPHelper links)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlRole = urlParams?.get('role');
  const urlSection = urlParams?.get('section');

  // Apply URL params on mount
  useEffect(() => {
    if (urlRole && ROLE_TABS.some((t) => t.key === urlRole)) {
      setRoleFilter(urlRole);
    }
    if (urlSection) {
      setSearchQuery(urlSection);
    }
  }, []);

  const filtered = useMemo(() => {
    let sections = SOP_DATA;

    if (roleFilter !== 'all') {
      sections = sections.filter((s) => s.role === roleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sections = sections
        .map((section) => {
          // Check if section title matches
          if (section.title.toLowerCase().includes(q)) return section;

          // Filter procedures that match
          const matchingProcedures = section.procedures.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.steps.some((s) => s.toLowerCase().includes(q))
          );

          if (matchingProcedures.length === 0) return null;
          return { ...section, procedures: matchingProcedures };
        })
        .filter(Boolean) as SOPSection[];
    }

    return sections;
  }, [roleFilter, searchQuery]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Standard Operating Procedures
            </h1>
            <p className="text-muted-foreground mt-1">
              Step-by-step guides for every role in the store.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 print:hidden">
          {/* Role tabs */}
          <div className="flex flex-wrap gap-2">
            {ROLE_TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={roleFilter === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search procedures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* SOP Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No procedures found matching your filters.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filtered.map((section) => (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <SectionIcon
                      name={section.icon}
                      className="h-5 w-5 text-muted-foreground"
                    />
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <Badge className={ROLE_COLORS[section.role] || ''} variant="secondary">
                      {section.role.charAt(0).toUpperCase() + section.role.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {section.procedures.map((proc, i) => (
                    <ProcedureCardNumbered
                      key={proc.title}
                      procedure={proc}
                      defaultOpen={
                        // Auto-expand when there is a search match or URL section param
                        !!searchQuery.trim() || !!urlSection
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
