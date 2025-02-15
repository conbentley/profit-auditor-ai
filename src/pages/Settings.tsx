import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";

const formSchema = z.object({
  // Profile Settings
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company_name: z.string().optional(),
  company_website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  job_title: z.string().optional(),
  phone_number: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string(),
  social_links: z.object({
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
    twitter: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal("")),
    other: z.string().url("Please enter a valid URL").optional().or(z.literal(""))
  }),
  
  // Financial Integration Settings
  data_refresh_interval: z.string(),
  
  // Audit Settings
  audit_frequency: z.enum(['on_demand', 'weekly', 'monthly']),
  audit_schedule_time: z.string(),
  audit_schedule_day: z.number().nullable(),
  
  // Notification Settings
  email_notifications: z.boolean(),
  email_frequency: z.enum(['instant', 'daily', 'weekly']),
  in_app_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  
  // Benchmark Settings
  ai_explanation_detail: z.enum(['basic', 'intermediate', 'advanced']),
  
  // Display Settings
  dashboard_layout: z.enum(['grid', 'list']),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  
  // Security Settings
  two_factor_enabled: z.boolean(),
  data_sharing_enabled: z.boolean(),
});

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { settings, isLoading, updateSettings, isUpdating } = useUserSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: settings || {
      audit_frequency: 'on_demand',
      email_frequency: 'instant',
      ai_explanation_detail: 'intermediate',
      dashboard_layout: 'grid',
      theme: 'system',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      social_links: {
        linkedin: '',
        twitter: '',
        other: ''
      }
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateSettings(values);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full mb-6">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
                  <TabsTrigger value="display">Display</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="api">API</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card className="p-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="Enter your email address" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="tel" 
                                    placeholder="Enter your contact number (optional)" 
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Your preferred contact number
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bio</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Tell us about yourself or your company"
                                    className="resize-none"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  A brief description that helps us understand you better
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Professional Information</h3>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="job_title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your job title"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your company name" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="company_website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Website</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url"
                                    placeholder="https://your-company.com"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Location & Timezone</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Your city"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="country"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Your country"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timezone</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select your timezone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                                      <SelectItem key={tz} value={tz}>
                                        {tz}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-medium mb-4">Social Links</h3>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="social_links.linkedin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn Profile</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url"
                                    placeholder="https://linkedin.com/in/your-profile"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="social_links.twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter Profile</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url"
                                    placeholder="https://twitter.com/your-handle"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="social_links.other"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Other Social Profile</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url"
                                    placeholder="https://other-social-network.com/profile"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="integrations">
                  <Card className="p-8">
                    <FormField
                      control={form.control}
                      name="data_refresh_interval"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Data Refresh Interval</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select interval" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1 hour">Every hour</SelectItem>
                              <SelectItem value="6 hours">Every 6 hours</SelectItem>
                              <SelectItem value="12 hours">Every 12 hours</SelectItem>
                              <SelectItem value="24 hours">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </Card>
                </TabsContent>

                <TabsContent value="audit">
                  <Card className="p-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="audit_frequency"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Audit Frequency</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="on_demand">On Demand</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {form.watch("audit_frequency") !== "on_demand" && (
                        <>
                          <Separator className="my-6" />
                          <FormField
                            control={form.control}
                            name="audit_schedule_time"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel>Schedule Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications">
                  <Card className="p-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="email_notifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-4">
                            <div>
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Receive audit reports via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sms_notifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-4">
                            <div>
                              <FormLabel>SMS Notifications</FormLabel>
                              <FormDescription>
                                Receive alerts via SMS
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="benchmarks">
                  <Card className="p-8">
                    <FormField
                      control={form.control}
                      name="ai_explanation_detail"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>AI Explanation Detail</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select detail level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </Card>
                </TabsContent>

                <TabsContent value="display">
                  <Card className="p-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Theme</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dashboard_layout"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Dashboard Layout</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select layout" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="grid">Grid</SelectItem>
                                <SelectItem value="list">List</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="security">
                  <Card className="p-8">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="two_factor_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-4">
                            <div>
                              <FormLabel>Two-Factor Authentication</FormLabel>
                              <FormDescription>
                                Enhance your account security
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="data_sharing_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-x-4">
                            <div>
                              <FormLabel>Data Sharing</FormLabel>
                              <FormDescription>
                                Share anonymous data for better insights
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="api">
                  <Card className="p-8">
                    <div className="text-sm text-gray-500">
                      API key management coming soon...
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
}
