
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone_number: '',
    job_title: '',
    company_website: '',
    bio: '',
    city: '',
    country: '',
  });

  useEffect(() => {
    if (settings) {
      // Check if user has any profile data set
      const hasProfileData = settings.full_name || 
                           settings.company_name || 
                           settings.phone_number || 
                           settings.job_title || 
                           settings.company_website || 
                           settings.bio || 
                           settings.city || 
                           settings.country;

      // If no profile data, show edit form by default
      setIsEditing(!hasProfileData);
      
      // Update form data with existing settings
      setFormData({
        full_name: settings.full_name || '',
        company_name: settings.company_name || '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setIsEditing(false);
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  // Show profile view when not editing and has data
  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Profile Information</h3>
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{settings.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{settings.email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{settings.company_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Job Title</p>
              <p className="font-medium">{settings.job_title || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium">{settings.phone_number || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company Website</p>
              <p className="font-medium">{settings.company_website || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Country</p>
              <p className="font-medium">{settings.country || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">City</p>
              <p className="font-medium">{settings.city || 'Not set'}</p>
            </div>
          </div>
          
          {settings.bio && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Bio</p>
              <p className="font-medium whitespace-pre-wrap">{settings.bio}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Show edit form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Edit Profile</h3>
        {/* Only show Cancel button if profile data exists */}
        {(settings.full_name || settings.company_name) && (
          <Button 
            variant="ghost" 
            onClick={() => setIsEditing(false)}
            type="button"
          >
            Cancel
          </Button>
        )}
      </div>

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
          <label htmlFor="company_name" className="text-sm font-medium">Company Name</label>
          <Input
            id="company_name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="Your Company Name"
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
