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
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ProfileSettings = () => {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [cities, setCities] = useState<ICity[]>([]);
  const [openCountry, setOpenCountry] = useState(false);
  const [openCity, setOpenCity] = useState(false);
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
    setOpenCountry(false);
  };

  const handleCityChange = (value: string) => {
    setFormData(prev => ({ ...prev, city: value }));
    setOpenCity(false);
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
          <Popover open={openCountry} onOpenChange={setOpenCountry}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCountry}
                className="w-full justify-between"
              >
                {formData.country || "Select a country..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search country..." />
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {countries.map((country) => (
                    <CommandItem
                      key={country.isoCode}
                      value={country.name}
                      onSelect={handleCountryChange}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.country === country.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {country.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium">City <span className="text-red-500">*</span></label>
          <Popover open={openCity} onOpenChange={setOpenCity}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCity}
                className="w-full justify-between"
                disabled={!formData.country}
              >
                {formData.city || (formData.country ? "Select a city..." : "Select a country first")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search city..." />
                <CommandEmpty>No city found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {cities.map((city) => (
                    <CommandItem
                      key={city.name}
                      value={city.name}
                      onSelect={handleCityChange}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.city === city.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {city.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
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
