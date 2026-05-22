import type { ReactNode } from 'react';

export interface ElectronScreenshotsOperationOptionText {
    type?: 'text';
    title?: string;
    description?: string;
    text: string;
}

export interface ElectronScreenshotsOperationOptionList {
    type: 'list';
    title?: string;
    description?: string;
    items: string[];
    ordered?: boolean;
}

export interface ElectronScreenshotsOperationOptionKeyValueItem {
    label: string;
    value: string;
}

export interface ElectronScreenshotsOperationOptionKeyValue {
    type: 'key-value';
    title?: string;
    description?: string;
    items: ElectronScreenshotsOperationOptionKeyValueItem[];
}

export type ElectronScreenshotsOperationOption =
    | string
    | ElectronScreenshotsOperationOptionText
    | ElectronScreenshotsOperationOptionList
    | ElectronScreenshotsOperationOptionKeyValue;

function renderStructuredOptionHeader(
    option:
        | ElectronScreenshotsOperationOptionText
        | ElectronScreenshotsOperationOptionList
        | ElectronScreenshotsOperationOptionKeyValue,
): ReactNode {
    return (
        <>
            {option.title ? (
                <div className="screenshots-electron-option-title">{option.title}</div>
            ) : null}
            {option.description ? (
                <div className="screenshots-electron-option-description">
                    {option.description}
                </div>
            ) : null}
        </>
    );
}

export function renderElectronOperationOption(
    option: ElectronScreenshotsOperationOption | undefined,
): ReactNode {
    if (!option) {
        return undefined;
    }

    if (typeof option === 'string') {
        return (
            <div className="screenshots-electron-option-panel">
                <pre className="screenshots-electron-option-text">{option}</pre>
            </div>
        );
    }

    if (option.type === 'list') {
        const ListTag = option.ordered ? 'ol' : 'ul';

        return (
            <div className="screenshots-electron-option-panel">
                {renderStructuredOptionHeader(option)}
                <ListTag className="screenshots-electron-option-list">
                    {option.items.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                    ))}
                </ListTag>
            </div>
        );
    }

    if (option.type === 'key-value') {
        return (
            <div className="screenshots-electron-option-panel">
                {renderStructuredOptionHeader(option)}
                <dl className="screenshots-electron-option-key-values">
                    {option.items.map((item) => (
                        <div
                            key={`${item.label}-${item.value}`}
                            className="screenshots-electron-option-key-value"
                        >
                            <dt className="screenshots-electron-option-key">{item.label}</dt>
                            <dd className="screenshots-electron-option-value">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        );
    }

    return (
        <div className="screenshots-electron-option-panel">
            {renderStructuredOptionHeader(option)}
            <pre className="screenshots-electron-option-text">{option.text}</pre>
        </div>
    );
}