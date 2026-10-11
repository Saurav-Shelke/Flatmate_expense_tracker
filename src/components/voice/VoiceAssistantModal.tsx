import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Volume2,
  Calendar,
  Users,
  Tag,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatPaise, getLocalDateString } from '@/lib/utils';
import { api } from '@/lib/api';
import { ParsedAiExpense, HouseholdMember, Category } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface VoiceAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: HouseholdMember[];
  categories: Category[];
}

export function VoiceAssistantModal({
  open,
  onOpenChange,
  members,
  categories,
}: VoiceAssistantModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedExpense, setParsedExpense] = useState<ParsedAiExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English / Hinglish friendly

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => (prev + ' ' + finalTranscript).trim());
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (event.error !== 'no-speech') {
        setError(`Microphone notice: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setInterimText('');
      setSuccessMsg(null);
      setError(null);
    } else {
      // Prompt user or auto-start listening when modal opens
      if (browserSupported && !parsedExpense) {
        startListening();
      }
    }
  }, [open]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      setError(null);
      recognitionRef.current.start();
    } catch (e: any) {
      // If already started, ignore
      console.warn('Start listening exception:', e);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Process speech transcript using backend Gemini AI
  const handleParseSpeech = async () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      setError('Please say or type something first.');
      return;
    }

    stopListening();
    setIsProcessing(true);
    setError(null);
    setParsedExpense(null);

    try {
      const res = await api<{ success: boolean; expense: ParsedAiExpense }>(
        'POST',
        '/ai/parse-expense',
        { speechText: fullText }
      );

      if (res.success && res.expense) {
        setParsedExpense(res.expense);
      } else {
        throw new Error('AI could not parse the expense. Please try again with more details.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse speech with Gemini AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the parsed expense into the database
  const handleSaveExpense = async () => {
    if (!parsedExpense || !user) return;
    setIsSaving(true);
    setError(null);

    try {
      if (parsedExpense.expense_type === 'personal') {
        await api('POST', '/expenses/personal', {
          description: parsedExpense.description,
          amount_paise: parsedExpense.amount_paise,
          category_id: parsedExpense.category || 'General',
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
        });
      } else if (parsedExpense.expense_type === 'on_behalf') {
        // Items must contain valid beneficiary IDs
        const items = (parsedExpense.items || []).map((it) => {
          let benId = it.beneficiary_id;
          // Fallback search member by name if needed
          if (!benId && it.beneficiary_name) {
            const found = members.find(
              (m) =>
                m.full_name.toLowerCase().includes(it.beneficiary_name!.toLowerCase()) ||
                m.username.toLowerCase().includes(it.beneficiary_name!.toLowerCase())
            );
            if (found) benId = found.id;
          }
          return {
            description: it.description,
            amount_paise: it.amount_paise,
            beneficiary_id: benId || user.id,
            category: it.category || 'General',
          };
        });

        if (items.length === 0) {
          throw new Error('No items or beneficiaries identified for on-behalf purchase.');
        }

        await api('POST', '/purchases', {
          description: parsedExpense.description,
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
          items,
        });
      } else if (parsedExpense.expense_type === 'common') {
        // Common expense
        const shares = (parsedExpense.shares || []).map((s) => ({
          user_id: s.user_id,
          amount_paise: s.amount_paise,
        }));

        if (shares.length === 0) {
          throw new Error('No participant shares calculated for common expense.');
        }

        await api('POST', '/expenses/common', {
          description: parsedExpense.description,
          amount_paise: parsedExpense.amount_paise,
          category_id: parsedExpense.category || 'General',
          expense_date: parsedExpense.expense_date || getLocalDateString(),
          paid_by: parsedExpense.paid_by_id || user.id,
          split_method: parsedExpense.split_method || 'equal',
          notes: parsedExpense.notes || `Added via Voice AI: "${transcript}"`,
          shares,
        });
      }

      setSuccessMsg('Expense recorded successfully! 🎉');
      // Invalidate relevant React Queries so all screens update in 0ms
      queryClient.invalidateQueries();

      // Reset and close after brief delight delay
      setTimeout(() => {
        setParsedExpense(null);
        setTranscript('');
        setSuccessMsg(null);
        onOpenChange(false);
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setParsedExpense(null);
    setTranscript('');
    setInterimText('');
    setError(null);
    setSuccessMsg(null);
    startListening();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
        {/* Glowing Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-blue-950/40 via-slate-900/60 to-transparent border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Voice Expense Assistant
                  <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 bg-cyan-950/30 text-[10px] font-mono">
                    Gemini 3.5 AI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Speak naturally in English or Hinglish to record any expense
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success State */}
          {successMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-5 text-center flex flex-col items-center justify-center space-y-2 animate-in fade-in zoom-in-95">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
              <div className="text-base font-semibold text-emerald-300">{successMsg}</div>
              <div className="text-xs text-slate-400">Balances and activity have been updated live.</div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">{error}</div>
            </div>
          )}

          {!parsedExpense && !successMsg && (
            <>
              {/* Mic Visualizer / Recording Pulse */}
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative flex items-center justify-center">
                  {/* Outer pulsing wave rings */}
                  {isListening && (
                    <>
                      <div className="absolute h-28 w-28 rounded-full bg-cyan-500/20 animate-ping duration-1000" />
                      <div className="absolute h-36 w-36 rounded-full bg-blue-500/10 animate-pulse duration-700" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isProcessing}
                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    className={`relative z-10 h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                      isListening
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white scale-110 shadow-cyan-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                    }`}
                  >
                    {isListening ? (
                      <Mic className="h-9 w-9 animate-bounce" />
                    ) : (
                      <MicOff className="h-8 w-8 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {isListening
                      ? 'Listening... Speak now'
                      : 'Tap mic or type below'}
                  </span>
                </div>
              </div>

              {/* Real-time Transcript & Manual Edit Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                    Transcript / Voice input
                  </span>
                  {transcript && (
                    <button
                      type="button"
                      onClick={() => {
                        setTranscript('');
                        setInterimText('');
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/60 transition-all">
                  <textarea
                    rows={3}
                    value={transcript + (interimText ? ' ' + interimText : '')}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Try saying: 'Bought groceries for 450 rupees, split equally' or 'Ordered Biryani 300 for Saurav and Harshal'..."
                    className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed"
                  />
                  {interimText && (
                    <span className="text-xs italic text-cyan-400/80 animate-pulse">
                      (listening...)
                    </span>
                  )}
                </div>
              </div>

              {/* Sample Voice Prompts */}
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Quick examples to try:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bought milk and bread 120 rupees personal',
                    'Paid 600 WiFi split equally among all',
                    'Bought 200 snacks for Saurav',
                  ].map((eg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTranscript(eg)}
                      className="text-left text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors"
                    >
                      "{eg}"
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Parse Button */}
              <Button
                type="button"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium shadow-lg shadow-blue-500/20"
                onClick={handleParseSpeech}
                disabled={isProcessing || (!transcript.trim() && !interimText.trim())}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gemini is parsing expense details...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-cyan-200" />
                    Parse & Review with Gemini AI
                  </>
                )}
              </Button>
            </>
          )}

          {/* Parsed Result Confirmation Card */}
          {parsedExpense && !successMsg && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Parsed Expense Review
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
                {/* Expense Type Badge & Total Amount */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    {parsedExpense.expense_type === 'personal' && (
                      <Badge className="bg-purple-950/60 border-purple-500/40 text-purple-300">
                        Personal Expense
                      </Badge>
                    )}
                    {parsedExpense.expense_type === 'on_behalf' && (
                      <Badge className="bg-cyan-950/60 border-cyan-500/40 text-cyan-300">
                        Purchased For Others
                      </Badge>
                    )}
                    {parsedExpense.expense_type === 'common' && (
                      <Badge className="bg-emerald-950/60 border-emerald-500/40 text-emerald-300">
                        Shared Common Expense
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {formatPaise(parsedExpense.amount_paise)}
                  </div>
                </div>

                {/* Description & Category */}
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Description</div>
                  <div className="text-base font-semibold text-slate-100">
                    {parsedExpense.description}
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    <span>{parsedExpense.expense_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                    <Tag className="h-4 w-4 text-purple-400" />
                    <span>{parsedExpense.category || 'General'}</span>
                  </div>
                </div>

                {/* On-behalf Items Breakdown */}
                {parsedExpense.expense_type === 'on_behalf' &&
                  parsedExpense.items &&
                  parsedExpense.items.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-cyan-400" />
                        Flatmate Breakdown ({parsedExpense.items.length} items):
                      </div>
                      <div className="space-y-1.5">
                        {parsedExpense.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800"
                          >
                            <span className="text-slate-200">
                              {it.description} &bull;{' '}
                              <strong className="text-cyan-400">
                                {it.beneficiary_name || 'Member'}
                              </strong>
                            </span>
                            <span className="font-mono font-medium text-emerald-400">
                              {formatPaise(it.amount_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Common Split Shares Breakdown */}
                {parsedExpense.expense_type === 'common' &&
                  parsedExpense.shares &&
                  parsedExpense.shares.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-emerald-400" />
                        Participant Splits ({parsedExpense.shares.length} flatmates):
                      </div>
                      <div className="space-y-1.5">
                        {parsedExpense.shares.map((sh, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800"
                          >
                            <span className="text-slate-200">{sh.user_name}</span>
                            <span className="font-mono font-medium text-emerald-400">
                              {formatPaise(sh.amount_paise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {parsedExpense.summary && (
                  <div className="text-[11px] text-slate-400 italic bg-blue-950/30 p-2.5 rounded-lg border border-blue-900/40">
                    💡 {parsedExpense.summary}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
