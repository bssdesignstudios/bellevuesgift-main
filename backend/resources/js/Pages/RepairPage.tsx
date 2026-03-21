import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Wrench, Search, CheckCircle, Clock, Package, AlertCircle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StorefrontLayout } from '@/components/layout/StorefrontLayout';
import { PageMeta } from '@/components/PageMeta';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-500', icon: <Clock className="h-4 w-4" /> },
  received: { label: 'Received', color: 'bg-indigo-500', icon: <Package className="h-4 w-4" /> },
  diagnosing: { label: 'Diagnosing', color: 'bg-yellow-500', icon: <Search className="h-4 w-4" /> },
  awaiting_parts: { label: 'Awaiting Parts', color: 'bg-orange-500', icon: <AlertCircle className="h-4 w-4" /> },
  in_progress: { label: 'In Progress', color: 'bg-purple-500', icon: <Wrench className="h-4 w-4" /> },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  completed: { label: 'Completed', color: 'bg-emerald-600', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: <AlertCircle className="h-4 w-4" /> },
};

const STATUS_ORDER = ['submitted', 'received', 'diagnosing', 'awaiting_parts', 'in_progress', 'ready_for_pickup', 'completed'];

interface RepairFormData {
  customer_name: string;
  phone: string;
  email: string;
  preferred_contact: string;
  service_type: string;
  item_make: string;
  model_number: string;
  serial_number: string;
  problem_description: string;
  dropoff_method: string;
  requested_date: string;
  deposit_required: boolean;
  notes: string;
}

export default function RepairPage() {
  const [activeTab, setActiveTab] = useState('request');
  const [searchTicket, setSearchTicket] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{ ticket_number: string } | null>(null);

  const [formData, setFormData] = useState<RepairFormData>({
    customer_name: '',
    phone: '',
    email: '',
    preferred_contact: 'phone',
    service_type: 'repair',
    item_make: '',
    model_number: '',
    serial_number: '',
    problem_description: '',
    dropoff_method: 'in-store',
    requested_date: '',
    deposit_required: false,
    notes: '',
  });

  const { data: searchedTicket, isLoading: isSearching, refetch: searchTicketRefetch } = useQuery({
    queryKey: ['repair-ticket', searchTicket],
    queryFn: async () => {
      if (!searchTicket.trim()) return null;
      try {
        const response = await axios.post('/api/repair/status', {
          ticket_number: searchTicket.toUpperCase().trim()
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    enabled: false,
    retry: false
  });

  const submitMutation = useMutation({
    mutationFn: async (data: RepairFormData) => {
      const response = await axios.post('/api/repair/requests', data);
      return response.data;
    },
    onSuccess: (ticket) => {
      setSubmittedTicket(ticket);
      toast.success('Repair request submitted successfully!');
      // Reset form
      setFormData({
        customer_name: '',
        phone: '',
        email: '',
        preferred_contact: 'phone',
        service_type: 'repair',
        item_make: '',
        model_number: '',
        serial_number: '',
        problem_description: '',
        dropoff_method: 'in-store',
        requested_date: '',
        deposit_required: false,
        notes: '',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to submit repair request: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.phone || !formData.problem_description) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  const handleSearch = () => {
    if (searchTicket.trim()) {
      searchTicketRefetch();
    }
  };

  const getStatusIndex = (status: string) => STATUS_ORDER.indexOf(status);

  const content = (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wrench className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Repair & Installations</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional repair services for electronics, audio visual equipment, and more.
          Submit a request or check your repair status.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request">Submit Request</TabsTrigger>
          <TabsTrigger value="status">Check Status</TabsTrigger>
        </TabsList>

        {/* Submit Request Tab */}
        <TabsContent value="request">
          {submittedTicket ? (
            <Card className="text-center">
              <CardContent className="py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
                <p className="text-muted-foreground mb-6">
                  Your repair request has been received. Please save your ticket number.
                </p>

                <div className="bg-muted p-6 rounded-lg inline-block mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Ticket Number</p>
                  <p className="text-3xl font-mono font-bold text-primary">{submittedTicket.ticket_number}</p>
                </div>

                <div className="flex justify-center mb-6">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={submittedTicket.ticket_number} size={150} />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Show this QR code or ticket number when you drop off your item.
                </p>

                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setSubmittedTicket(null)}>
                    Submit Another Request
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSearchTicket(submittedTicket.ticket_number);
                    setActiveTab('status');
                    setSubmittedTicket(null);
                  }}>
                    Check Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Repair / Installation Request</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Customer Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Your Name *</Label>
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preferred_contact">Preferred Contact Method</Label>
                      <Select
                        value={formData.preferred_contact}
                        onValueChange={(value) => setFormData({ ...formData, preferred_contact: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service_type">Service Type *</Label>
                      <Select
                        value={formData.service_type}
                        onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="installation">Installation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dropoff_method">Drop-off Method</Label>
                      <Select
                        value={formData.dropoff_method}
                        onValueChange={(value) => setFormData({ ...formData, dropoff_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-store">In-Store Drop-off</SelectItem>
                          <SelectItem value="pickup">Request Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="item_make">Item Make/Brand</Label>
                      <Input
                        id="item_make"
                        value={formData.item_make}
                        onChange={(e) => setFormData({ ...formData, item_make: e.target.value })}
                        placeholder="e.g., Sony, Samsung"
                      />
                    </div>
                    <div>
                      <Label htmlFor="model_number">Model #</Label>
                      <Input
                        id="model_number"
                        value={formData.model_number}
                        onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="serial_number">Serial #</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="problem_description">Problem Description *</Label>
                    <Textarea
                      id="problem_description"
                      value={formData.problem_description}
                      onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
                      placeholder="Describe the issue or installation requirements..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requested_date">Preferred Date</Label>
                      <Input
                        id="requested_date"
                        type="date"
                        value={formData.requested_date}
                        onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deposit_required"
                          checked={formData.deposit_required}
                          onCheckedChange={(checked) => setFormData({ ...formData, deposit_required: checked as boolean })}
                        />
                        <Label htmlFor="deposit_required" className="font-normal">
                          I understand a deposit may be required
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any other information we should know..."
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Check Status Tab */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Check Repair Status</CardTitle>
              <CardDescription>
                Enter your ticket number to see the current status of your repair.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-8">
                <Input
                  placeholder="Enter ticket number (e.g., RPR-2026-000001)"
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>

              {searchedTicket && (
                <div className="space-y-6">
                  {/* Ticket Header */}
                  <div className="bg-muted p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Ticket Number</p>
                        <p className="text-2xl font-mono font-bold">{searchedTicket.ticket_number}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-white flex items-center gap-2 ${STATUS_LABELS[searchedTicket.status]?.color || 'bg-gray-500'}`}>
                        {STATUS_LABELS[searchedTicket.status]?.icon}
                        {STATUS_LABELS[searchedTicket.status]?.label || searchedTicket.status}
                      </div>
                    </div>

                    {searchedTicket.eta_date && (
                      <p className="text-sm">
                        <strong>Estimated Completion:</strong> {new Date(searchedTicket.eta_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Status Timeline */}
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                    {STATUS_ORDER.filter(s => s !== 'cancelled').map((status, index) => {
                      const currentIndex = getStatusIndex(searchedTicket.status);
                      const isCompleted = index <= currentIndex;
                      const isCurrent = status === searchedTicket.status;

                      return (
                        <div key={status} className="relative flex items-center gap-4 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}>
                            {STATUS_LABELS[status]?.icon}
                          </div>
                          <span className={isCompleted ? 'font-medium' : 'text-muted-foreground'}>
                            {STATUS_LABELS[status]?.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Item Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Item Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Service:</strong> {searchedTicket.service_type === 'repair' ? 'Repair' : 'Installation'}</p>
                        {searchedTicket.item_make && <p><strong>Make:</strong> {searchedTicket.item_make}</p>}
                        {searchedTicket.model_number && <p><strong>Model:</strong> {searchedTicket.model_number}</p>}
                        {searchedTicket.serial_number && <p><strong>Serial:</strong> {searchedTicket.serial_number}</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">Problem Description</h3>
                      <p className="text-sm text-muted-foreground">{searchedTicket.problem_description}</p>
                    </div>
                  </div>

                  {/* Notes from staff */}
                  {searchedTicket.notes && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Staff Notes</h3>
                      <p className="text-sm">{searchedTicket.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {searchTicket && !searchedTicket && !isSearching && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No ticket found with that number.</p>
                  <p className="text-sm text-muted-foreground">Please check the ticket number and try again.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Quick Turnaround</h3>
            <p className="text-sm text-muted-foreground">
              Most repairs completed within 3-5 business days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Wrench className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Expert Technicians</h3>
            <p className="text-sm text-muted-foreground">
              Certified professionals for all major brands
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Warranty Included</h3>
            <p className="text-sm text-muted-foreground">
              90-day warranty on all repairs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <StorefrontLayout>
      <PageMeta
        title="Device &amp; Electronics Repair"
        description="Book a repair for your phone, laptop, or electronics at Bellevue Gifts & Supplies, Freeport. Fast turnaround, experienced technicians."
        canonical="https://bellevue.gifts/repair"
      />
      {content}
    </StorefrontLayout>
  );
}
