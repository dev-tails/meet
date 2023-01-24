import SwiftUI
import CloudKit

struct NoteListItem: View {
    @ObservedObject var vm = sharedCDDailyViewModel
    private var _note: Note
    private var _onEdit: (Note)->()
    private var _onDelete: (Note)->()
    @State var start: Date = Date()
    
    init(note: Note, onEdit: @escaping (Note)->(), onDelete: @escaping (Note)->()) {
        self._note = note
        self._onEdit = onEdit
        self._onDelete = onDelete
    }
    
    let typeToIconMap = [
        "note": "minus.circle",
        "task": "circle",
        "task_completed": "smallcircle.fill.circle",
    ]
    
    func toggleType() {
        let type = _note.type == "task" ? "task_completed" : "task"

        let noteToSave = Note(id: _note.id, type: type, recordId: _note.recordId)

        vm.saveNote(note: noteToSave)
    }
    
    var body: some View {
        return HStack {
            if (_note.type == "task" || _note.type == "task_completed") {
                Button(action: toggleType) {
                    Image(systemName: _note.type == "task_completed" ? "checkmark.square" : "square")
                }
            }
            if (_note.type == "event") {
                DatePicker("", selection: $start, displayedComponents: .hourAndMinute)
                    .labelsHidden()
                    .onAppear() {
                        if _note.start != nil {
                            start = _note.start!
                        }
                    }
                    .onChange(of: start) { newValue in
//                        let dateFormatter = DateFormatter()
//                        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
//                        let startString = dateFormatter.string(from: start)
                        
                        vm.saveNote(note: Note(id: _note.id, type: "event", start: start))
                    }
            }
            Text(try! AttributedString(markdown: _note.body!))
        }
            .contextMenu {
                Button(action: {
                    _onEdit(_note)
                }){
                    Text("Edit")
                }
                Button(action: {
                    handleSharePressed(note: _note)
                }){
                    Text("Share")
                }
                Button(action: {
                    _onDelete(_note)
                }){
                    Text("Delete")
                }
            }
            .opacity(_note.type == "task_completed" ? 0.25 : 1.0)
    }
    
    func handleSharePressed(note: Note) {
        let textToShare = [ note.body ]
        let activityViewController = UIActivityViewController(activityItems: textToShare, applicationActivities: nil)
        UIApplication.shared.windows.first?.rootViewController?.present(activityViewController, animated: true, completion: nil)
    }

}
