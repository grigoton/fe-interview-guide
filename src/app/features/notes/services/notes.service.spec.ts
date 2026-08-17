import { TestBed } from '@angular/core/testing';
import { NotesService } from './notes.service';

/** Fresh service instance, so each test starts from the current storage state. */
function createService(): NotesService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [NotesService] });
  return TestBed.inject(NotesService);
}

describe('NotesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a course and opens it', () => {
    const service = createService();
    const course = service.addCourse({ title: '  Claude Code  ', provider: 'Anthropic', url: '' });

    expect(course.title).toBe('Claude Code');
    expect(service.courses().length).toBe(1);
    expect(service.activeCourse()?.id).toBe(course.id);
  });

  it('adds notes to a course and counts them', () => {
    const service = createService();
    const course = service.addCourse({ title: 'Course', provider: '', url: '' });

    service.addNote(course.id, { title: 'Lesson 1', body: '# Hi', tags: [' agents ', '', 'mcp'] });
    service.addNote(course.id, { title: 'Lesson 2', body: '', tags: [] });

    expect(service.notes().length).toBe(2);
    expect(service.noteCountByCourse()[course.id]).toBe(2);
    // Newest first, tags trimmed and de-blanked.
    expect(service.notes()[0].title).toBe('Lesson 2');
    expect(service.notes()[1].tags).toEqual(['agents', 'mcp']);
  });

  it('stamps updatedAt when a note changes', () => {
    const service = createService();
    const course = service.addCourse({ title: 'Course', provider: '', url: '' });
    const note = service.addNote(course.id, { title: 'Draft', body: 'a', tags: [] });

    service.updateNote(note.id, { title: 'Final', body: 'b', tags: ['x'] });

    const updated = service.notes()[0];
    expect(updated.title).toBe('Final');
    expect(updated.createdAt).toBe(note.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(note.createdAt));
  });

  it('removes a course together with its notes and opens the next one', () => {
    const service = createService();
    const first = service.addCourse({ title: 'First', provider: '', url: '' });
    const second = service.addCourse({ title: 'Second', provider: '', url: '' });
    service.addNote(second.id, { title: 'Note', body: '', tags: [] });

    service.removeCourse(second.id);

    expect(service.courses().map((c) => c.id)).toEqual([first.id]);
    expect(service.notes().length).toBe(0);
    expect(service.activeCourse()?.id).toBe(first.id);
  });

  it('survives a reload through localStorage', () => {
    const service = createService();
    const course = service.addCourse({ title: 'Persisted', provider: 'Anthropic', url: '' });
    service.addNote(course.id, { title: 'Note', body: 'body', tags: ['tag'] });

    const reloaded = createService();

    expect(reloaded.courses()[0].title).toBe('Persisted');
    expect(reloaded.notes()[0].tags).toEqual(['tag']);
    expect(reloaded.activeCourse()?.id).toBe(course.id);
  });

  it('ignores corrupt storage instead of throwing', () => {
    localStorage.setItem('fe-guide-course-notes', '{ not json');

    const service = createService();

    expect(service.courses()).toEqual([]);
    expect(service.activeCourse()).toBeNull();
  });

  it('merges an exported backup back in, overwriting by id', () => {
    const source = createService();
    const course = source.addCourse({ title: 'Original', provider: '', url: '' });
    source.addNote(course.id, { title: 'Kept', body: '', tags: [] });
    const backup = source.toJson();

    source.updateCourse(course.id, { title: 'Renamed locally', provider: '', url: '' });
    const result = source.importJson(backup);

    expect(result).toEqual({ courses: 1, notes: 1 });
    expect(source.courses().length).toBe(1);
    expect(source.courses()[0].title).toBe('Original');
  });

  it('rejects a file that is not an export', () => {
    const service = createService();

    expect(service.importJson('nope')).toBeNull();
    expect(service.importJson('{"foo":1}')).toBeNull();
  });
});
