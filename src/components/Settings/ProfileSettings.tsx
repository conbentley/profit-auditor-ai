
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [formData, setFormData] = useState({
    full_name: settings?.full_name || '',
    email: settings?.email || '',
    phone_number: settings?.phone_number || '',
    job_title: settings?.job_title || '',
    company_website: settings?.company_website || '',
    bio: settings?.bio || '',
    city: settings?.city || '',
    country: settings?.country || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Clear city if country changes
    if (name === 'country') {
      setFormData(prev => ({ ...prev, [name]: value, city: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
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
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
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
          <label htmlFor="company_website" className="text-sm font-medium">Company Website</label>
          <Input
            id="company_website"
            name="company_website"
            value={formData.company_website}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="country" className="text-sm font-medium">Country <span className="text-red-500">*</span></label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Enter your country"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium">City <span className="text-red-500">*</span></label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder={formData.country ? "Enter your city" : "Please select a country first"}
            disabled={!formData.country}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-medium">Bio</label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          placeholder="Tell us about yourself..."
          className="h-32"
        />
      </div>

      <Button type="submit" disabled={isUpdating}>
        {isUpdating ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default ProfileSettings;
