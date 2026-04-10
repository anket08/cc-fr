package com.cymops.service;

import com.cymops.dto.IncidentTimelineDto;
import com.cymops.repository.IncidentTimelineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimelineService {

    private final IncidentTimelineRepository timelineRepository;

    public List<IncidentTimelineDto> getTimelineByRoomId(Long roomId) {
        return timelineRepository.findByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(t -> IncidentTimelineDto.builder()
                        .id(t.getId())
                        .roomId(t.getRoom() != null ? t.getRoom().getId() : null)
                        .eventType(t.getEventType())
                        .content(t.getContent())
                        .metadata(t.getMetadata())
                        .createdAt(t.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
