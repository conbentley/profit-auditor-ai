
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Mail, Phone, HelpCircle, BookOpen, Clock } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";

export default function Support() {
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I connect my accounting software?",
      answer: "Go to Integrations > Financial Integrations and select your accounting software provider. Follow the step-by-step guide to connect your account securely."
    },
    {
      question: "What data security measures do you have in place?",
      answer: "We employ industry-standard encryption, regular security audits, and strict data access controls. All financial data is encrypted at rest and in transit."
    },
    {
      question: "How often are profit audits generated?",
      answer: "Profit audits are generated daily by default. You can adjust the frequency in your settings or generate manual audits as needed."
    },
    {
      question: "Can I export my audit reports?",
      answer: "Yes, you can export audit reports in PDF or CSV format. Look for the Export button in the top right corner of any audit report."
    },
    {
      question: "How does the AI Profit Assistant work?",
      answer: "The AI Profit Assistant analyzes your financial data and provides insights, recommendations, and answers to your questions. It uses advanced AI to understand your business context and financial patterns."
    }
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: user.id,
            name,
            email,
            message,
            status: 'open'
          }
        ]);

      if (error) throw error;

      toast.success("Support ticket submitted successfully!");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      toast.error("Failed to submit support ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Search Section */}
            <section>
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
                <HelpCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </section>

            {/* Quick Links */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/ai-profit-assistant")}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground">Chat with our AI for instant help</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Documentation</h3>
                    <p className="text-sm text-muted-foreground">Browse our detailed guides</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Support Hours</h3>
                    <p className="text-sm text-muted-foreground">24/7 Support Available</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* FAQs */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Contact Options */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Mail className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium">Email Support</h3>
                    <p className="text-sm text-muted-foreground">support@profitauditor.com</p>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <Phone className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium">Phone Support</h3>
                    <p className="text-sm text-muted-foreground">+1 (888) 123-4567</p>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <MessageSquare className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium">Live Chat</h3>
                    <p className="text-sm text-muted-foreground">Available 24/7</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Support Ticket Form */}
            <section>
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Submit a Support Ticket</h2>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">Name</label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </form>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
