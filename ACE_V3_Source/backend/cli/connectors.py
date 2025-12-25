from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict

sys.path.append(str(Path(__file__).parent.parent))

from connectors.manager import ConnectorStore, ConnectorConfig
from core.config import settings


def parse_options(option_text: str) -> Dict[str, str]:
    options: Dict[str, str] = {}
    if not option_text:
        return options
    parts = option_text.split(',')
    for part in parts:
        if '=' not in part:
            continue
        key, value = part.split('=', 1)
        options[key.strip()] = value.strip()
    return options


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    parser = argparse.ArgumentParser(description='Manage ACE connectors')
    sub = parser.add_subparsers(dest='command')

    sub.add_parser('list', help='List connectors')

    add_parser = sub.add_parser('add', help='Add or update connector')
    add_parser.add_argument('--name', required=True)
    add_parser.add_argument('--type', required=True)
    add_parser.add_argument('--interval-seconds', type=int, default=3600)
    add_parser.add_argument('--options', help='Comma-separated key=value pairs')
    add_parser.add_argument('--options-file', help='Path to JSON file with options dict')
    add_parser.add_argument('--enabled', action='store_true')
    add_parser.add_argument('--disabled', action='store_true')

    delete_parser = sub.add_parser('delete', help='Delete connector')
    delete_parser.add_argument('--name', required=True)

    toggle_parser = sub.add_parser('toggle', help='Enable or disable connector')
    toggle_parser.add_argument('--name', required=True)
    toggle_parser.add_argument('--enable', action='store_true')
    toggle_parser.add_argument('--disable', action='store_true')

    args = parser.parse_args(argv)

    if not settings.connectors_enabled:
        print('Connectors feature disabled. Enable via ACE_CONNECTORS_ENABLED.', file=sys.stderr)
        return 1

    store = ConnectorStore(Path(settings.connectors_config_path))

    if args.command == 'list':
        configs = store.list()
        print(json.dumps([cfg.model_dump() for cfg in configs], indent=2))
        return 0

    if args.command == 'add':
        opts = parse_options(args.options or '')
        if args.options_file:
            file_opts = json.loads(Path(args.options_file).read_text())
            opts.update(file_opts)
        enabled = True
        if args.disabled:
            enabled = False
        elif args.enabled:
            enabled = True
        config = ConnectorConfig(
            name=args.name,
            type=args.type,
            interval_seconds=args.interval_seconds,
            options=opts,
            enabled=enabled,
        )
        store.upsert(config)
        print(json.dumps(config.model_dump(), indent=2))
        return 0

    if args.command == 'delete':
        if store.delete(args.name):
            print(f'Removed connector {args.name}')
            return 0
        print('Connector not found', file=sys.stderr)
        return 1

    if args.command == 'toggle':
        cfg = store.get(args.name)
        if not cfg:
            print('Connector not found', file=sys.stderr)
            return 1
        if args.enable:
            cfg.enabled = True
        elif args.disable:
            cfg.enabled = False
        else:
            cfg.enabled = not cfg.enabled
        store.upsert(cfg)
        print(json.dumps(cfg.model_dump(), indent=2))
        return 0

    parser.print_help()
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
