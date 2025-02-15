
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });
  const [formData, setFormData] = useState({
    phone_number: '',
    job_title: '',
    company_website: '',
    bio: '',
    city: '',
    country: '',
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  // Initialize form data with settings when they're loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        phone_number: settings.phone_number || '',
        job_title: settings.job_title || '',
        company_website: settings.company_website || '',
        bio: settings.bio || '',
        city: settings.city || '',
        country: settings.country || '',
      });
    }
  }, [settings]);

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
    // Only update fields that exist in the user_settings table
    const settingsData = {
      phone_number: formData.phone_number,
      job_title: formData.job_title,
      company_website: formData.company_website,
      bio: formData.bio,
      city: formData.city,
      country: formData.country,
    };
    updateSettings(settingsData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
          <Input
            id="full_name"
            name="full_name"
            value={profile.full_name || ''}
            onChange={handleChange}
            placeholder="John Doe"
            disabled // Disabled because it should be managed in profiles table
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
