
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating, isLoading } = useUserSettings();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    phone_number: '',
    job_title: '',
    company_website: '',
    country: '',
    city: '',
    bio: ''
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        full_name: settings.full_name || '',
        email: settings.email || '',
        company_name: settings.company_name || '',
        phone_number: settings.phone_number || '',
        job_title: settings.job_title || '',
        company_website: settings.company_website || '',
        country: settings.country || '',
        city: settings.city || '',
        bio: settings.bio || ''
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    updateSettings(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading profile information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold">{settings?.full_name || 'Name not set'}</h3>
          <p className="text-muted-foreground">{settings?.bio || 'No bio available'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Professional Details</h4>
            <div className="space-y-1">
              <p><span className="text-muted-foreground">Company:</span> {settings?.company_name || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Role:</span> {settings?.job_title || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Website:</span> {settings?.company_website || 'Not specified'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Contact Information</h4>
            <div className="space-y-1">
              <p><span className="text-muted-foreground">Email:</span> {settings?.email || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Phone:</span> {settings?.phone_number || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Location:</span> {settings?.city && settings?.country ? `${settings.city}, ${settings.country}` : 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Card className="p-6">
            <h4 className="text-lg font-medium mb-4">Edit Profile</h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="company_name" className="text-sm font-medium">Company Name</label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone_number" className="text-sm font-medium">Phone Number</label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="job_title" className="text-sm font-medium">Job Title</label>
                  <Input
                    id="job_title"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="company_website" className="text-sm font-medium">Company Website (Optional)</label>
                  <Input
                    id="company_website"
                    name="company_website"
                    value={formData.company_website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="country" className="text-sm font-medium">Country</label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="Enter your country"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium">City</label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter your city"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="bio" className="text-sm font-medium">Bio (Optional)</label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="h-32"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
