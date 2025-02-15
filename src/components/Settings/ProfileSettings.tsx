
import { useUserSettings } from "@/hooks/useUserSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Country, City, ICity } from "country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [cities, setCities] = useState<ICity[]>([]);
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

  const countries = Country.getAllCountries();

  useEffect(() => {
    if (formData.country) {
      const countryCities = City.getCitiesOfCountry(
        countries.find(c => c.name === formData.country)?.isoCode || ''
      ) || [];
      setCities(countryCities);

      // If the current city is not in the new country, reset it
      if (!countryCities.some(city => city.name === formData.city)) {
        setFormData(prev => ({ ...prev, city: '' }));
      }
    }
  }, [formData.country]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value: string) => {
    setFormData(prev => ({ ...prev, country: value, city: '' }));
  };

  const handleCityChange = (value: string) => {
    setFormData(prev => ({ ...prev, city: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone_number" className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></label>
          <Input
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="job_title" className="text-sm font-medium">Job Title <span className="text-red-500">*</span></label>
          <Input
            id="job_title"
            name="job_title"
            value={formData.job_title}
            onChange={handleChange}
            placeholder="Software Engineer"
            required
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
          <Select value={formData.country} onValueChange={handleCountryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.isoCode} value={country.name}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium">City <span className="text-red-500">*</span></label>
          <Select 
            value={formData.city} 
            onValueChange={handleCityChange}
            disabled={!formData.country}
          >
            <SelectTrigger>
              <SelectValue placeholder={formData.country ? "Select a city" : "Select a country first"} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
