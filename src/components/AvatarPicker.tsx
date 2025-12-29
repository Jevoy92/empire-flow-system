import { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { characterAvatars } from '@/data/avatars';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar: string | null;
  userId: string;
  onAvatarChange: (avatarUrl: string) => void;
}

export function AvatarPicker({ open, onOpenChange, currentAvatar, userId, onAvatarChange }: AvatarPickerProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    currentAvatar?.startsWith('character:') ? currentAvatar.replace('character:', '') : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCharacterSelect = async (characterId: string) => {
    setSelectedCharacter(characterId);
    setIsSaving(true);
    
    try {
      const avatarValue = `character:${characterId}`;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarValue })
        .eq('id', userId);
      
      if (error) throw error;
      
      onAvatarChange(avatarValue);
      toast({ title: 'Avatar updated!' });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to update avatar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Please select an image file' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Image must be less than 2MB' });
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update profile with cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      onAvatarChange(avatarUrl);
      setSelectedCharacter(null);
      toast({ title: 'Avatar uploaded!' });
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Failed to upload avatar' });
    } finally {
      setIsUploading(false);
    }
  };

  const isCustomImage = currentAvatar && !currentAvatar.startsWith('character:');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Choose Your Avatar</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="characters" className="h-[calc(100%-60px)]">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="characters" className="h-[calc(100%-60px)] overflow-y-auto pb-8">
            <p className="text-sm text-muted-foreground mb-4">
              Pick a character that represents your work style
            </p>
            <div className="grid grid-cols-2 gap-3">
              {characterAvatars.map((char) => {
                const isSelected = selectedCharacter === char.id || currentAvatar === `character:${char.id}`;
                return (
                  <button
                    key={char.id}
                    onClick={() => handleCharacterSelect(char.id)}
                    disabled={isSaving}
                    className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-full ${char.color} flex items-center justify-center text-2xl mb-2`}>
                      {char.emoji}
                    </div>
                    <p className="font-medium text-sm text-foreground">{char.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      "{char.motivation}"
                    </p>
                  </button>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a custom profile picture (max 2MB)
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4 py-8">
              {isCustomImage && currentAvatar ? (
                <div className="relative">
                  <img 
                    src={currentAvatar} 
                    alt="Current avatar" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {isCustomImage ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
