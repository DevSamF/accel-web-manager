import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import classes from './LogsViewer.module.css';

const withCurrentTimestamp = (line) => {
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return line.replace(/^\[[^\]]+\]/, `[${time}]`);
};

const parseLogLine = (line, index) => {
    const match = line.match(/^\[([^\]]+)\]:\s*(\w+):\s*(.*)$/);
    const rawLevel = match?.[2]?.toLowerCase() || 'info';
    return {
        id: `${index}-${line}`,
        number: index + 1,
        timestamp: match?.[1] || '',
        level: rawLevel === 'warning' ? 'warn' : rawLevel,
        message: match?.[3] || line,
        raw: line,
    };
};

const highlightMessage = (message) => message.split(/(RADIUS\(\d+\)|<[^>]+>|"[^"]*"|\b(?:ppp\d+|eno\d+)\b)/gi).map((part, index) => {
    let tokenClass = '';
    if (/^RADIUS\(/i.test(part)) tokenClass = classes.radiusToken;
    else if (part.startsWith('<')) tokenClass = classes.attributeToken;
    else if (part.startsWith('"')) tokenClass = classes.valueToken;
    else if (/^(ppp\d+|eno\d+)$/i.test(part)) tokenClass = classes.interfaceToken;
    return tokenClass ? <span className={tokenClass} key={index}>{part}</span> : part;
});

const LogsViewer = () => {
    const [lines, setLines] = useState([]);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const cursor = useRef(null);
    const output = useRef(null);

    useEffect(() => {
        let mounted = true;
        let timer;

        const poll = async () => {
            try {
                const params = cursor.current === null ? {} : { cursor: cursor.current };
                const response = await axios.get('logs', { params });
                if (!mounted) return;
                const data = response.data;
                cursor.current = data.cursor;
                if (data.lines?.length) {
                    setLines(previous => [...previous, ...data.lines].slice(-2000));
                }
            } catch {
                // Keep the viewer focused on log content; transient API errors do not add status badges.
            }
        };

        const startPolling = () => {
            poll();
            timer = window.setInterval(poll, 1500);
        };

        const startLocalDemo = async () => {
            try {
                const response = await fetch('/demo-logs.local.json', { cache: 'no-store' });
                if (!response.ok) throw new Error('Local fixture not found');
                const fixture = await response.json();
                if (!Array.isArray(fixture) || fixture.length === 0 || !fixture.every(line => typeof line === 'string')) {
                    throw new Error('Local fixture must be a non-empty array of log lines');
                }
                if (!mounted) return;
                let index = 0;
                const appendNextLine = () => {
                    setLines(previous => [...previous, withCurrentTimestamp(fixture[index])].slice(-2000));
                    index = (index + 1) % fixture.length;
                };
                appendNextLine();
                timer = window.setInterval(appendNextLine, 1500);
            } catch {
                if (mounted) startPolling();
            }
        };

        if (import.meta.env.DEV) startLocalDemo();
        else startPolling();

        return () => { mounted = false; window.clearInterval(timer); };
    }, []);

    const parsedLines = useMemo(() => lines.map(parseLogLine), [lines]);
    const counts = useMemo(() => parsedLines.reduce((result, line) => {
        result[line.level] = (result[line.level] || 0) + 1;
        return result;
    }, {}), [parsedLines]);
    const levels = useMemo(() => ['info', 'warn', 'error', ...Object.keys(counts).filter(level => !['info', 'warn', 'error'].includes(level))], [counts]);
    const visibleLines = useMemo(() => {
        const query = search.trim().toLowerCase();
        return parsedLines.filter(line => (levelFilter === 'all' || line.level === levelFilter)
            && (!query || line.raw.toLowerCase().includes(query)));
    }, [parsedLines, levelFilter, search]);

    useEffect(() => {
        if (output.current) output.current.scrollTop = output.current.scrollHeight;
    }, [lines]);

    const filters = [{ key: 'all', label: 'All' }, ...levels.map(level => ({
        key: level,
        label: level.charAt(0).toUpperCase() + level.slice(1),
    }))];

    return (
        <section className={classes.container}>
            <div className={classes.toolbar}>
                <label className={classes.searchBox}>
                    <span aria-hidden="true" className={classes.searchIcon} />
                    <input
                        type="search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Filtrar logs..."
                        aria-label="Filtrar logs"
                    />
                </label>
                <div className={classes.filters} role="group" aria-label="Filtrar por nível do log">
                    {filters.map(filter => (
                        <button
                            type="button"
                            key={filter.key}
                            className={`${classes.filterButton} ${levelFilter === filter.key ? classes.filterActive : ''} ${classes[`filter_${filter.key}`] || ''}`}
                            onClick={() => setLevelFilter(filter.key)}
                            aria-pressed={levelFilter === filter.key}
                        >
                            {filter.label} ({filter.key === 'all' ? parsedLines.length : counts[filter.key] || 0})
                        </button>
                    ))}
                </div>
            </div>
            <div className={classes.output} ref={output} aria-live="polite">
                {visibleLines.length ? visibleLines.map(line => (
                    <div className={classes.logRow} key={line.id}>
                        <span className={classes.lineNumber}>{String(line.number).padStart(2, '0')}</span>
                        <time className={classes.timestamp}>{line.timestamp || '—'}</time>
                        <span className={`${classes.levelBadge} ${classes[`level_${line.level}`] || classes.level_default}`}>
                            <span>{line.level.toUpperCase()}</span>
                        </span>
                        <code className={classes.message}>{highlightMessage(line.message)}</code>
                    </div>
                )) : (
                    <div className={classes.emptyState}>
                        {lines.length ? 'Nenhum log corresponde ao filtro.' : 'Aguardando entradas de log...'}
                    </div>
                )}
            </div>
        </section>
    );
};

export default LogsViewer;
