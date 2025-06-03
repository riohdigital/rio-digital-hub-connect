
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

type Language = 'portuguese' | 'english';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Idioma:</span>
      </div>
      
      <RadioGroup
        value={selectedLanguage}
        onValueChange={(value) => onLanguageChange(value as Language)}
        className="flex flex-row gap-6"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="portuguese" id="portuguese" />
          <Label htmlFor="portuguese" className="text-sm cursor-pointer">
            🇧🇷 Português
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="english" id="english" />
          <Label htmlFor="english" className="text-sm cursor-pointer">
            🇺🇸 English
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
