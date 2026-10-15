"""Small, bounded reader for a configured Accel-PPP log file."""

MAX_READ_BYTES = 128 * 1024
MAX_LINES = 500


def read_accel_logs(path, cursor=None):
    """Return log lines and the next byte cursor, tailing on the first request."""
    with open(path, "rb") as log_file:
        log_file.seek(0, 2)
        size = log_file.tell()

        if cursor is None:
            start = max(0, size - MAX_READ_BYTES)
            log_file.seek(start)
            if start:
                log_file.readline()  # discard a partial first line
        else:
            start = max(0, min(cursor, size))
            if cursor > size:  # file was rotated or truncated
                start = 0
            log_file.seek(start)
            if start:
                log_file.seek(start - 1)
                if log_file.read(1) != b"\n":
                    log_file.readline()  # discard a partial line from previous poll

        lines = log_file.readlines(MAX_READ_BYTES)
        next_cursor = log_file.tell()
        if len(lines) > MAX_LINES:
            lines = lines[-MAX_LINES:]
        decoded_lines = [
            line.decode("utf-8", errors="replace").rstrip("\r\n")
            for line in lines
        ]
        return decoded_lines, next_cursor
