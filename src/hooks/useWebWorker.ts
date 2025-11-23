import { useEffect, useRef, useCallback } from 'react';
import { TreeNode } from '../parsers/jsonParser';

interface WorkerMessage {
  type: 'PARSE_SUCCESS' | 'PARSE_ERROR' | 'PARSE_PROGRESS' | 'EXPAND_SUCCESS' | 'EXPAND_ERROR';
  nodes?: TreeNode[];
  error?: string;
  message?: string;
  originalInput?: string;
}

interface UseWebWorkerProps {
  onParseSuccess: (nodes: TreeNode[], originalInput?: string) => void;
  onParseError: (error: string) => void;
  onParseProgress: (message: string) => void;
  onExpandSuccess: (nodes: TreeNode[]) => void;
  onExpandError: (error: string) => void;
}

export const useWebWorker = ({
  onParseSuccess,
  onParseError,
  onParseProgress,
  onExpandSuccess,
  onExpandError,
}: UseWebWorkerProps) => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker('/worker.js');
    
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, nodes, error, message, originalInput }: WorkerMessage = e.data;
      
      if (type === 'PARSE_SUCCESS' && nodes) {
        onParseSuccess(nodes, originalInput);
      } else if (type === 'PARSE_ERROR' && error) {
        onParseError(error);
      } else if (type === 'PARSE_PROGRESS' && message) {
        onParseProgress(message);
      } else if (type === 'EXPAND_SUCCESS' && nodes) {
        onExpandSuccess(nodes);
      } else if (type === 'EXPAND_ERROR' && error) {
        onExpandError(error);
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [onParseSuccess, onParseError, onParseProgress, onExpandSuccess, onExpandError]);

  const parseJson = useCallback((input: string) => {
    workerRef.current?.postMessage({
      type: 'PARSE_JSON',
      data: input
    });
  }, []);

  const expandToMatches = useCallback((nodes: TreeNode[], matchIds: string[]) => {
    workerRef.current?.postMessage({
      type: 'EXPAND_TO_MATCHES',
      data: { nodes, matchIds }
    });
  }, []);

  return { parseJson, expandToMatches };
};
