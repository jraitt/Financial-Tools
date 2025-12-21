'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, FolderOpen, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { saveConfiguration, getConfigurations, deleteConfiguration, SavedConfiguration } from '@/app/actions/configurations';
import { formatDistanceToNow } from 'date-fns';

interface ConfigurationManagerProps {
    appId: string;
    currentData: any;
    onLoad: (data: any) => void;
}

export function ConfigurationManager({ appId, currentData, onLoad }: ConfigurationManagerProps) {
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isLoadOpen, setIsLoadOpen] = useState(false);
    const [isOverwriteAlertOpen, setIsOverwriteAlertOpen] = useState(false);

    const [configName, setConfigName] = useState('');
    const [configs, setConfigs] = useState<SavedConfiguration[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadedConfigId, setLoadedConfigId] = useState<string | null>(null);
    const [pendingOverwriteId, setPendingOverwriteId] = useState<string | null>(null);

    // Fetch configurations when load dialog opens or save dialog opens (to check for collisions)
    useEffect(() => {
        if (isLoadOpen || isSaveOpen) {
            loadConfigs();
        }
    }, [isLoadOpen, isSaveOpen]);

    const loadConfigs = async () => {
        setIsLoading(true);
        try {
            const data = await getConfigurations(appId);
            setConfigs(data);
        } catch (error) {
            toast.error('Failed to load configurations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveClick = async () => {
        if (!configName.trim()) {
            toast.error('Please enter a name');
            return;
        }

        // Check for collision
        const existingConfig = configs.find(c => c.name?.toLowerCase() === configName.trim().toLowerCase());

        if (existingConfig) {
            setPendingOverwriteId(existingConfig.id);
            setIsOverwriteAlertOpen(true);
            return;
        }

        // No collision, normal save
        // If we have a loadedConfigId but the user changed the name to something new, it will create a new one.
        // If the user *kept* the name of the loaded config, it would have been caught above.
        await performSave(undefined);
    };

    const handleOverwriteConfirm = async () => {
        if (pendingOverwriteId) {
            await performSave(pendingOverwriteId);
            setIsOverwriteAlertOpen(false);
            setPendingOverwriteId(null);
        }
    };

    const performSave = async (id: string | undefined) => {
        try {
            await saveConfiguration(appId, configName, currentData, id);
            toast.success(id ? 'Configuration updated' : 'Configuration saved');

            if (id) {
                setLoadedConfigId(id); // Update loaded ID if we overwrote
            } else {
                // If new, we don't necessarily know the new ID without returning it from server action, 
                // but that's a minor optimization for now.
                setLoadedConfigId(null);
            }

            setConfigName('');
            setIsSaveOpen(false);
            loadConfigs(); // Refresh list to get new updated items
        } catch (error) {
            toast.error('Failed to save configuration');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteConfiguration(id);
            toast.success('Configuration deleted');
            if (loadedConfigId === id) setLoadedConfigId(null);
            loadConfigs();
        } catch (error) {
            toast.error('Failed to delete configuration');
        }
    };

    const handleLoad = (config: SavedConfiguration) => {
        onLoad(config.inputData);
        setLoadedConfigId(config.id);
        if (config.name) setConfigName(config.name); // Pre-fill name for potential update
        setIsLoadOpen(false);
        toast.success(`Loaded configuration: ${config.name}`);
    };

    return (
        <div className="flex gap-2">
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Save className="h-4 w-4" />
                        Save
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Save Configuration</DialogTitle>
                        <DialogDescription>
                            Save your current inputs. Use an existing name to overwrite.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                placeholder="e.g., Scenario A - Early Retirement"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveClick}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isOverwriteAlertOpen} onOpenChange={setIsOverwriteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Overwrite Configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            A configuration named "{configName}" already exists. Do you want to overwrite it with your current changes?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingOverwriteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleOverwriteConfirm}>Overwrite</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isLoadOpen} onOpenChange={setIsLoadOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Load
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Load Configuration</DialogTitle>
                        <DialogDescription>
                            Select a saved configuration to restore.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
                        ) : configs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <FolderOpen className="h-8 w-8 opacity-20" />
                                <p>No saved configurations found.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {configs.map((config) => (
                                    <div
                                        key={config.id}
                                        className={`flex justify-between items-center p-3 rounded-lg border transition-colors cursor-pointer group ${loadedConfigId === config.id ? 'bg-primary/5 border-primary/50' : 'bg-card hover:bg-accent/50'
                                            }`}
                                        onClick={() => handleLoad(config)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium flex items-center gap-2">
                                                {config.name || 'Untitled'}
                                                {loadedConfigId === config.id && (
                                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Active</span>
                                                )}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {config.updatedAt && formatDistanceToNow(new Date(config.updatedAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => handleDelete(config.id, e)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
