import { render, screen, fireEvent } from '@testing-library/react';
import { RecordButton } from '../RecordButton';

describe('RecordButton', () => {
  const mockHandlers = {
    onStart: jest.fn(),
    onStop: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render start button when not recording', () => {
    render(
      <RecordButton
        isRecording={false}
        isPaused={false}
        {...mockHandlers}
      />
    );

    const button = screen.getByLabelText('Aufnahme starten');
    expect(button).toBeInTheDocument();
  });

  it('should call onStart when start button is clicked', () => {
    render(
      <RecordButton
        isRecording={false}
        isPaused={false}
        {...mockHandlers}
      />
    );

    const button = screen.getByLabelText('Aufnahme starten');
    fireEvent.click(button);

    expect(mockHandlers.onStart).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onStop).not.toHaveBeenCalled();
  });

  it('should render recording controls when recording', () => {
    render(
      <RecordButton
        isRecording={true}
        isPaused={false}
        {...mockHandlers}
      />
    );

    const stopButton = screen.getByLabelText('Aufnahme stoppen');
    const pauseButton = screen.getByLabelText('Pausieren');

    expect(stopButton).toBeInTheDocument();
    expect(pauseButton).toBeInTheDocument();
  });

  it('should call onStop when stop button is clicked', () => {
    render(
      <RecordButton
        isRecording={true}
        isPaused={false}
        {...mockHandlers}
      />
    );

    const stopButton = screen.getByLabelText('Aufnahme stoppen');
    fireEvent.click(stopButton);

    expect(mockHandlers.onStop).toHaveBeenCalledTimes(1);
  });

  it('should call onPause when pause button is clicked', () => {
    render(
      <RecordButton
        isRecording={true}
        isPaused={false}
        {...mockHandlers}
      />
    );

    const pauseButton = screen.getByLabelText('Pausieren');
    fireEvent.click(pauseButton);

    expect(mockHandlers.onPause).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onResume).not.toHaveBeenCalled();
  });

  it('should call onResume when resume button is clicked', () => {
    render(
      <RecordButton
        isRecording={true}
        isPaused={true}
        {...mockHandlers}
      />
    );

    const resumeButton = screen.getByLabelText('Fortsetzen');
    fireEvent.click(resumeButton);

    expect(mockHandlers.onResume).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onPause).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <RecordButton
        isRecording={false}
        isPaused={false}
        disabled={true}
        {...mockHandlers}
      />
    );

    const button = screen.getByLabelText('Aufnahme starten');
    expect(button).toBeDisabled();
  });

  it('should not call handlers when disabled', () => {
    render(
      <RecordButton
        isRecording={false}
        isPaused={false}
        disabled={true}
        {...mockHandlers}
      />
    );

    const button = screen.getByLabelText('Aufnahme starten');
    fireEvent.click(button);

    expect(mockHandlers.onStart).not.toHaveBeenCalled();
  });
});
